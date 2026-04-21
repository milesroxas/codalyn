-- Drop legacy Better Auth default `admin` app role (full admin plugin access). We only use `product_admin`.
UPDATE "user" SET role = 'user' WHERE role = 'admin';
