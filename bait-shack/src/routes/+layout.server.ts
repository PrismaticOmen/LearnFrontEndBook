import { redirect } from "@sveltejs/kit";

export const load = async ({ locals, request }) => {
  try {
    await locals.pb.health.check();
  } catch (e) {
    return {
      user: null,
      health: {
        status: "down",
      },
    };
  }
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
