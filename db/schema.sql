DROP TABLE IF EXISTS "users";

CREATE TABLE "users" (
    "id" serial NOT NULL,
    "name" character varying(255) NULL,
    "email" character varying(255) NOT NULL,
    "password" character varying(255) NOT NULL,
    "created_at" timestamp NULL,
    "is_admin" boolean NULL,
    CONSTRAINT "users_pk" PRIMARY KEY ("id"),
    CONSTRAINT "users_unique_email" UNIQUE ("email")
);
