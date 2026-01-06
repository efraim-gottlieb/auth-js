import { test, describe } from "node:test";
import assert from "node:assert";
import { getById, sum } from "./index.js";

describe("sum func", () => {
  test("return correct output when given a valid input", () => {
    assert.strictEqual(sum(1, 5), 6);
  });
  test("check negative values", () => {
    assert.strictEqual(sum(-5, -1), -6);
  });
  test("throw error when argument is not a number", () => {
    assert.throws(() => sum("1", 2));
    assert.throws(() => sum(1, "2"));
  });
});

describe('p promise function', ()=>{
  test('return user when id founded', async ()=>{
    assert.deepEqual(await getById(1), {name: 'efraim', id:1})
  })
  test("throw error when id not found", ()=>{
    assert.rejects(getById())
  })
})
