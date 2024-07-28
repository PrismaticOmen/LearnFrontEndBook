import { redirect } from "@sveltejs/kit";

export const load = ({ locals, request }) => {
  if (locals.user) {
    return {
      user: locals.user,
    };
  }

  if (!request.url.includes("/signin")) {
    {
      throw redirect(303, "/signin");
    }
  }
};
