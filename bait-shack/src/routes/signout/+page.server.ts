import { redirect } from "@sveltejs/kit";

export const actions = {
  default: async ({ locals }) => {
    locals.pb.authStore.clear();
    throw redirect(303, "/signin");
  },
};
