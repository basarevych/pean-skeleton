The database
============

1. Create the database

  ```shell
  # su - postgres
  OR
  # su - pgsql

  > psql -d template1

  postgres=# create user username_here with password 'password_here';
  postgres=# create database db_name_here;
  postgres=# grant all privileges on database db_name_here to username_here;
  postgres=# \q

  > psql -U username_here -d db_name_here < db/schema.sql
  ```

2. Populate the database

  ```shell
  > ./bin/cmd populate-db
  ```
