import { Fragment } from "react";
import { Link } from "#/components/link";
import type { Organiser } from "#/queries";

/** Renders "A", "A and B", "A, B and C" — linking organisers who have a player page. */
export function OrganiserList({ organisers }: { organisers: Organiser[] }) {
  return (
    <>
      {organisers.map((organiser, i) => (
        <Fragment key={`${organiser.playerId}-${organiser.name}`}>
          {i > 0 && (i === organisers.length - 1 ? " and " : ", ")}
          {organiser.playerId != null ? (
            <Link
              to="/player/$id"
              params={{ id: organiser.playerId }}
              search={{
                tab: undefined,
                typeCode: undefined,
                painting: undefined,
                achievement: undefined,
              }}
            >
              {organiser.name}
            </Link>
          ) : (
            organiser.name
          )}
        </Fragment>
      ))}
    </>
  );
}
