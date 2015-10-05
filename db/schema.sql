DROP VIEW IF EXISTS "dt_users";

DROP TABLE IF EXISTS "user_roles";
DROP TABLE IF EXISTS "tokens";
DROP TABLE IF EXISTS "users";
DROP TABLE IF EXISTS "permissions";
DROP TABLE IF EXISTS "roles";

CREATE TABLE "roles" (
    "id" serial NOT NULL,
    "parent_id" int NULL,
    "handle" character varying(255) NOT NULL,
    "title" character varying(255) NOT NULL,
    CONSTRAINT "roles_pk" PRIMARY KEY("id"),
    CONSTRAINT "roles_unique_handle" UNIQUE ("handle"),
    CONSTRAINT "roles_parent_fk" FOREIGN KEY("parent_id")
        REFERENCES "roles"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "permissions" (
    "id" serial NOT NULL,
    "role_id" int NOT NULL,
    "resource" character varying(255) NULL,
    "action" character varying(255) NULL,
    CONSTRAINT "permissions_pk" PRIMARY KEY("id"),
    CONSTRAINT "permissions_role_fk" FOREIGN KEY("role_id")
        REFERENCES "roles"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "users" (
    "id" serial NOT NULL,
    "name" character varying(255) NULL,
    "email" character varying(255) NOT NULL,
    "password" character varying(255) NOT NULL,
    "created_at" timestamp NOT NULL,
    CONSTRAINT "users_pk" PRIMARY KEY ("id"),
    CONSTRAINT "users_unique_email" UNIQUE ("email")
);

CREATE TABLE "tokens" (
    "id" serial NOT NULL,
    "user_id" int NULL,
    "payload" json NOT NULL,
    "ip_address" character varying(255) NULL,
    "created_at" timestamp NOT NULL,
    "updated_at" timestamp NOT NULL,
    CONSTRAINT "sessions_pk" PRIMARY KEY ("id"),
    CONSTRAINT "sessions_user_fk" FOREIGN KEY("user_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "user_roles" (
    "id" serial NOT NULL,
    "user_id" int NOT NULL,
    "role_id" int NOT NULL,
    CONSTRAINT "user_roles_pk" PRIMARY KEY("id"),
    CONSTRAINT "user_roles_user_fk" FOREIGN KEY("user_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_roles_role_fk" FOREIGN KEY("role_id")
        REFERENCES "roles"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE VIEW dt_users AS
    SELECT u.*,
           string_agg(
               (SELECT DISTINCT r.handle
                  FROM roles r
                 WHERE r.id = ur.role_id
              ORDER BY r.handle),
              ', '
           ) AS roles,
           (SELECT count(t.*)
              FROM tokens t
             WHERE t.user_id = u.id) AS tokens
      FROM users u
 LEFT JOIN user_roles ur
        ON ur.user_id = u.id
  GROUP BY u.id;
