import { error, redirect } from "@sveltejs/kit";

export function load({ locals }) {
  if (locals.pb.authStore.isValid) {
    throw redirect(303, "/"); // or wherever you want to redirect signed-in users
  }

  return {};
}

export const actions = {
  default: async ({ request, locals }) => {
    const body = Object.fromEntries(await request.formData());

    try {
      await locals.pb
        .collection("users")
        .authWithPassword(body.email, body.password);
    } catch (err) {
      return {
        error: err.originalError.data,
      };
    }

    throw redirect(303, "/");
  },
};
