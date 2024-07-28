export const actions = {
  add: async ({ request, locals }) => {
    const body = Object.fromEntries(await request.formData());

    let error = null;
    let success = true;

    try {
      await locals.pb.collection("products").create(body);
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
