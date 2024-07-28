import { error } from "@sveltejs/kit";

export const load = async ({ locals, params }) => {
  let product;

  try {
    product = await locals.pb.collection("products").getOne(params.id);
  } catch (err) {
    if (err.status === 404) {
      error(404, {
        message: "Not found",
      });
    }
  }

  return { product };
};

export const actions = {
  default: async ({ request, locals }) => {
    const body = Object.fromEntries(await request.formData());

    if (body.image.name === "") {
      delete body.image;
    }

    let error = null;
    let success = true;

    try {
      await locals.pb.collection("products").update(body.id, body);
    } catch (err) {
      error = err.originalError;
      success = false;
    }

    return {
      success,
      error,
    };
  },
};
