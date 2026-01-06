import { error } from "node:console";

export function sum(a, b) {
  if (typeof a !== "number" || typeof b !== "number") {
    throw new TypeError("must be a number");
  }
  return a + b;
}

export async function getById(id) {
  return new Promise((res, rej) => {
    if (!id) rej(new Error("id not found"));
    setTimeout(
      () =>
        res({
          name: "efraim",
          id,
        }),
      1
    );
  });
}