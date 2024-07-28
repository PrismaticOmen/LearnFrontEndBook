export const actions = {
  default: async ({ request, locals }) => {
    const body = Object.fromEntries(await request.formData());

    let error = null;
    let success = true;
    let id = null;

    try {
      const result = await locals.pb.collection("products").create(body);
      id = result.id;
    } catch (err) {
      error = err.originalError;
      success = false;
    }

    return {
      success,
      id,
      error,
    };
  },
};
