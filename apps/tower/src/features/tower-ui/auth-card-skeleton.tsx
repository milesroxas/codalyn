import { AuthShell } from "@/features/tower-ui/auth-shell";
import { CardFormSkeleton } from "@/shared/ui/card-form-skeleton";

type AuthCardSkeletonProps = {
  variant: "sign-in" | "sign-up";
};

function AuthCardSkeleton({ variant }: AuthCardSkeletonProps) {
  const label = variant === "sign-in" ? "Loading sign in form" : "Loading sign up form";

  return (
    <AuthShell>
      <CardFormSkeleton
        label={label}
        titleWidth={variant === "sign-in" ? "w-32" : "w-44"}
        fields={
          variant === "sign-in"
            ? [{ fieldSize: "lg" }, { fieldSize: "lg" }]
            : [
                { fieldSize: "lg", labelWidth: "w-20" },
                { fieldSize: "lg", labelWidth: "w-20" },
                { fieldSize: "lg", labelWidth: "w-12" },
                { fieldSize: "lg", hint: true, labelWidth: "w-20" },
              ]
        }
      />
    </AuthShell>
  );
}

export { AuthCardSkeleton };
