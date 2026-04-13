import { describe, expect, it } from "vitest";

import {
  peopleRowsEqualServer,
  peopleRowsFromBulkLists,
  peopleRowsFromServer,
  serverListsFromPeopleRows,
} from "@/lib/dataroom/room-access-people";

describe("room-access-people", () => {
  it("peopleRowsFromServer unions allowed and contributors with upload flags", () => {
    const rows = peopleRowsFromServer({
      allowedRecipientEmails: ["a@x.com", "b@x.com"],
      contributorRecipientEmails: ["b@x.com"],
    });
    expect(rows).toEqual([
      { email: "a@x.com", canUpload: false },
      { email: "b@x.com", canUpload: true },
    ]);
  });

  it("serverListsFromPeopleRows maps rows back to API lists", () => {
    expect(
      serverListsFromPeopleRows([
        { email: "b@x.com", canUpload: true },
        { email: "a@x.com", canUpload: false },
      ]),
    ).toEqual({
      allowed: ["a@x.com", "b@x.com"],
      contributors: ["b@x.com"],
    });
  });

  it("peopleRowsEqualServer is true when lists match regardless of row order", () => {
    const meta = {
      allowedRecipientEmails: ["a@x.com"],
      contributorRecipientEmails: [] as string[],
    };
    expect(
      peopleRowsEqualServer([{ email: "a@x.com", canUpload: false }], meta),
    ).toBe(true);
  });

  it("peopleRowsFromBulkLists keeps upload subset within allowed", () => {
    const rows = peopleRowsFromBulkLists(["z@x.com", "a@x.com"], ["a@x.com"]);
    expect(rows).toEqual([
      { email: "a@x.com", canUpload: true },
      { email: "z@x.com", canUpload: false },
    ]);
  });
});
