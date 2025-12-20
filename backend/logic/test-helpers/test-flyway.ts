import { Flyway } from "node-flyway";

export async function runMigrations(db: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}) {
  const flyway = new Flyway({
    url: `jdbc:postgresql://${db.host}:${db.port}/${db.database}`,
    user: db.user,
    password: db.password,
    migrationLocations: ["filesystem:../../..db/migrations"],
  });

  await flyway.migrate();
}
