import { LucideIcon } from "lucide-react";

interface UserTypeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  badge: string;
  onClick: () => void;
}

const UserTypeCard = ({
  icon: Icon,
  title,
  description,
  features,
  badge,
  onClick,
}: UserTypeCardProps) => {
  return (
    <button
      onClick={onClick}
      className="card-hover group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-6 text-left w-full"
    >
      {/* Badge */}
      <div className="card-badge absolute top-4 right-4 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        {badge}
      </div>

      {/* Icon */}
      <div className="card-icon mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all duration-300">
        <Icon className="h-7 w-7" />
      </div>

      {/* Content */}
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground group-hover:text-inherit/70">
        {description}
      </p>

      {/* Features */}
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li
            key={index}
            className="flex items-center gap-2 text-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary group-hover:bg-background" />
            <span className="text-muted-foreground group-hover:text-inherit/80">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-6 flex items-center gap-2 font-semibold text-primary group-hover:text-inherit">
        Get Started
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </div>
    </button>
  );
};

export default UserTypeCard;
