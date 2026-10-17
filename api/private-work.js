import { handlePrivateWork } from "../server/private-work/handler.js";

export default async function privateWorkHandler(request, response) {
  return handlePrivateWork(request, response);
}
