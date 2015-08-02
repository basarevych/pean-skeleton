DROP TABLE IF EXISTS "users";

CREATE TABLE "users" (
    "id" serial NOT NULL,
    "name" character varying(255) NULL,
    "password" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "is_admin" boolean NULL,
    "created_at" timestamp NULL,
    CONSTRAINT "users_pk" PRIMARY KEY ("id"),
    CONSTRAINT "users_unique_email" UNIQUE ("email")
);
