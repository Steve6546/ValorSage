import { PythonShell } from 'python-shell';
import { VM } from 'vm2';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import { ExecutionStatus, RuntimeLanguage, type Execution, type InsertExecution } from '@shared/schema';

interface ExecutionOptions {
  code: string;
  language: RuntimeLanguage;
  input?: string;
  projectId: number;
  fileId?: number; // اختياري حيث أنه غير موجود في النموذج
  userId: number;
  timeout?: number;
}

interface ExecutionResult {
  output?: string;
  error?: string;
  execution: Execution;
}

// Temporary file executor helper for Python scripts
async function createTempFile(code: string, extension: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ako-execution-'));
  const filename = `${uuidv4()}.${extension}`;
  const filepath = path.join(tempDir, filename);
  await fs.writeFile(filepath, code);
  return filepath;
}

export async function executeCode(options: ExecutionOptions): Promise<ExecutionResult> {
  const {
    code,
    language,
    input,
    projectId,
    fileId,
    userId,
    timeout = 5000 // Default timeout of 5 seconds
  } = options;

  // Create initial execution record
  const execution = await storage.createExecution({
    projectId,
    userId,
    language,
    code,
    status: ExecutionStatus.RUNNING,
    output: null,
    error: null
  });

  try {
    let resultOutput: string | undefined = undefined;
    let resultError: string | undefined = undefined;

    // Execute based on language
    switch (language) {
      case RuntimeLanguage.JAVASCRIPT:
        try {
          // Create a secure sandbox to execute JS code
          const vm = new VM({
            timeout,
            sandbox: {},
            eval: false,
            wasm: false,
            fixAsync: true
          });

          // If there's input, make it available in the sandbox
          if (input) {
            vm.sandbox.input = input;
          }
          
          // Add console object that captures output
          let outputLog = '';
          vm.sandbox.console = {
            log: (...args: any[]) => {
              outputLog += args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
              ).join(' ') + '\n';
            },
            error: (...args: any[]) => {
              outputLog += 'Error: ' + args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
              ).join(' ') + '\n';
            }
          };

          // Run the code in the sandbox
          const runResult = vm.run(code);

          // If there's direct output from the execution, add it
          if (runResult !== undefined) {
            resultOutput = outputLog ? `${outputLog}${runResult}` : String(runResult);
          } else if (outputLog) {
            resultOutput = outputLog;
          }
        } catch (e) {
          resultError = e instanceof Error ? e.message : String(e);
        }
        break;

      case RuntimeLanguage.PYTHON:
        try {
          // Create a temporary file with the Python code
          const tempFile = await createTempFile(code, 'py');

          // Execute with PythonShell
          const pyOptions = {
            mode: 'text' as const,
            pythonPath: 'python3',
            scriptPath: path.dirname(tempFile),
            pythonOptions: ['-u'], // unbuffered output
            args: input ? [input] : []
          };

          const pyResult = await new Promise<string[]>((resolve, reject) => {
            try {
              const pyShell = new PythonShell(path.basename(tempFile), pyOptions);
              const results: string[] = [];

              // Collect output
              pyShell.on('message', (message) => {
                results.push(message);
              });

              // Handle errors
              pyShell.on('error', (err) => {
                reject(err);
              });

              // Finish execution
              pyShell.end((err) => {
                if (err) reject(err);
                else resolve(results);
              });
            } catch (err) {
              reject(err);
            }
          });

          resultOutput = pyResult.join('\n');

          // Clean up the temp file
          await fs.unlink(tempFile);
          await fs.rmdir(path.dirname(tempFile), { recursive: true });
        } catch (e) {
          resultError = e instanceof Error ? e.message : String(e);
        }
        break;

      default:
        resultError = `Unsupported language: ${language}`;
    }

    // Update execution record
    const updatedExecution = await storage.updateExecution(execution.id, {
      status: resultError ? ExecutionStatus.ERROR : ExecutionStatus.COMPLETED,
      output: resultOutput || null,
      error: resultError || null,
      completedAt: new Date()
    });

    return {
      output: resultOutput,
      error: resultError,
      execution: updatedExecution
    };
  } catch (e) {
    // If there was an error during the executor itself, update the record
    const systemError = e instanceof Error ? e.message : String(e);
    const updatedExecution = await storage.updateExecution(execution.id, {
      status: ExecutionStatus.ERROR,
      error: `System error: ${systemError}`,
      completedAt: new Date()
    });

    return {
      error: systemError,
      execution: updatedExecution
    };
  }
}