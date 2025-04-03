import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";

interface RippleButtonProps extends ButtonProps {
  children: React.ReactNode;
  className?: string;
}

interface RippleStyle {
  left: string;
  top: string;
  id: number;
}

const ButtonRipple: React.FC<RippleButtonProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  const [ripples, setRipples] = useState<RippleStyle[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleCount = useRef(0);

  useEffect(() => {
    // Clean up ripples after animation completes
    const timer = setTimeout(() => {
      if (ripples.length > 0) {
        setRipples([]);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [ripples]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const left = e.clientX - rect.left;
    const top = e.clientY - rect.top;

    rippleCount.current += 1;
    
    const newRipple = {
      left: `${left}px`,
      top: `${top}px`,
      id: rippleCount.current
    };

    setRipples([...ripples, newRipple]);
  };

  return (
    <Button
      ref={buttonRef}
      className={cn("relative overflow-hidden", className)}
      onClick={handleClick}
      {...props}
    >
      {children}
      {ripples.map((style) => (
        <span
          key={style.id}
          className="absolute pointer-events-none rounded-full bg-white bg-opacity-40 animate-ripple"
          style={{
            left: style.left,
            top: style.top,
            width: "20px",
            height: "20px",
            transform: "translate(-50%, -50%)"
          }}
        />
      ))}
    </Button>
  );
};

export default ButtonRipple;
