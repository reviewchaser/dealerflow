const toJSON = (schema) => {
  schema.options.toJSON = {
    virtuals: true,
    transform(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
    },
  };
};

export default toJSON;
