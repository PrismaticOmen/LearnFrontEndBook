export const load = async ({ locals }) => {
  const products = await locals.pb.collection("products").getList();

  return {
    products,
  };
};

export const actions = {
  delete: async ({ request, locals }) => {
    const body = Object.fromEntries(await request.formData());
    let success, error;

    try {
      await locals.pb.collection("products").delete(body.id);
      success = true;
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
