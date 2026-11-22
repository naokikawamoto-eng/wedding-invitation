import assert from "node:assert/strict";
import { test } from "node:test";
import { withHonorific } from "./honorific";

test("表示名だけ様を付ける", () => {
  assert.equal(withHonorific("河本直樹"), "河本直樹 様");
  assert.equal(withHonorific(" 河本直樹 "), "河本直樹 様");
  assert.equal(withHonorific("河本直樹 様"), "河本直樹 様");
  assert.equal(withHonorific(""), "");
});
