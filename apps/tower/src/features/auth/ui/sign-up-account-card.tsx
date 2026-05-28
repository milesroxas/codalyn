"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField, FormFieldGrid } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export type SignUpAccountCardProps = {
  cardDescription: string;
  firstNameId: string;
  lastNameId: string;
  emailId: string;
  passwordId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  inviteEmailLocked: boolean;
  errorMessage: string | null;
  pending: boolean;
  signInHref: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function SignUpAccountCard(props: SignUpAccountCardProps) {
  return (
    <Card className="border-border/80 shadow-lg shadow-black/4 dark:shadow-black/25">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xl font-semibold tracking-tight">Create your account</CardTitle>
        <CardDescription className="text-base leading-relaxed">{props.cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={props.onSubmit} className="flex flex-col gap-5">
          <FormFieldGrid>
            <FormField>
              <Label htmlFor={props.firstNameId}>First name</Label>
              <Input
                id={props.firstNameId}
                type="text"
                autoComplete="given-name"
                value={props.firstName}
                onChange={(event) => props.onFirstNameChange(event.target.value)}
                fieldSize="lg"
                surface="elevated"
              />
            </FormField>
            <FormField>
              <Label htmlFor={props.lastNameId}>Last name</Label>
              <Input
                id={props.lastNameId}
                type="text"
                autoComplete="family-name"
                value={props.lastName}
                onChange={(event) => props.onLastNameChange(event.target.value)}
                fieldSize="lg"
                surface="elevated"
              />
            </FormField>
          </FormFieldGrid>
          <FormField>
            <Label htmlFor={props.emailId}>Email</Label>
            <Input
              id={props.emailId}
              type="email"
              autoComplete="email"
              value={props.email}
              onChange={(event) => props.onEmailChange(event.target.value)}
              fieldSize="lg"
              surface="elevated"
              required
              readOnly={props.inviteEmailLocked}
              aria-readonly={props.inviteEmailLocked}
            />
          </FormField>
          <FormField>
            <Label htmlFor={props.passwordId}>Password</Label>
            <Input
              id={props.passwordId}
              type="password"
              autoComplete="new-password"
              value={props.password}
              onChange={(event) => props.onPasswordChange(event.target.value)}
              fieldSize="lg"
              surface="elevated"
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </FormField>
          {props.errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {props.errorMessage}
            </p>
          ) : null}
          <Button type="submit" disabled={props.pending} size="form" width="full">
            {props.pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col border-t border-border/60 bg-muted/20 px-6 py-4">
        <p className="text-left text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={props.signInHref} className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
