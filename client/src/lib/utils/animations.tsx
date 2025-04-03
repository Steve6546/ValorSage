import { keyframes, css } from "@emotion/react";

// Ripple animation
export const ripple = keyframes`
  to {
    transform: scale(4);
    opacity: 0;
  }
`;

export const rippleAnimation = css`
  animation: ${ripple} 0.6s linear;
`;

// Notification slide animation
export const notificationSlide = keyframes`
  0% {
    transform: translateX(100%);
    opacity: 0;
  }
  10% {
    transform: translateX(0);
    opacity: 1;
  }
  90% {
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
`;

export const notificationAnimation = css`
  animation: ${notificationSlide} 4s forwards;
`;

// Button hover effect animation
export const buttonHover = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
`;

export const buttonPulseAnimation = css`
  animation: ${buttonHover} 1.5s infinite;
`;

// Fade in animation
export const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export const fadeInAnimation = css`
  animation: ${fadeIn} 0.3s ease-in;
`;

// Bounce animation
export const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
`;

export const bounceAnimation = css`
  animation: ${bounce} 1s;
`;
