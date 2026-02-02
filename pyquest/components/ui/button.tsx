import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-gray-900 text-white hover:bg-gray-800': variant === 'default',
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
            'bg-green-600 text-white hover:bg-green-700': variant === 'secondary',
            'border-2 border-gray-300 bg-transparent hover:bg-gray-100': variant === 'outline',
            'hover:bg-gray-100': variant === 'ghost',
            'h-9 px-3 text-sm': size === 'sm',
            'h-11 px-5 text-base': size === 'md',
            'h-14 px-8 text-lg': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
