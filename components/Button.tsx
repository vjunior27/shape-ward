import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "w-full py-3 px-4 rounded-2xl font-bold transition-all duration-200 flex items-center justify-center font-sans tracking-wide active:scale-[0.98]";

  const variants = {
    primary: "bg-primary text-black hover:bg-primaryDark shadow-[0_0_20px_rgba(0,255,148,0.35)] hover:shadow-[0_0_30px_rgba(0,255,148,0.55)]",
    secondary: "glass text-primary border border-primary/40 hover:border-primary/70",
    ghost: "bg-transparent text-gray-400 hover:text-white",
    outline: "glass text-white hover:bg-white/[0.08]",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant] || variants.primary} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};