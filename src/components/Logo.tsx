import { Home } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  const textSizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  const iconSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${sizeClasses[size]} rounded-xl bg-primary flex items-center justify-center shadow-lg animate-pulse-glow`}
      >
        <Home className={`${iconSizeClasses[size]} text-primary-foreground`} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span
            className={`${textSizeClasses[size]} font-extrabold tracking-tight`}
          >
            Home<span className="text-primary">Mate</span>
          </span>
          {size === "lg" && (
            <span className="text-sm text-muted-foreground italic">
              A mate for all the home needs
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
