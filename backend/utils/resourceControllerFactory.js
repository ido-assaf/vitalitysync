const asyncHandler = require("./asyncHandler");
const { notFound, parseId, plain, validationError } = require("./controllerHelpers");
const { successResponse } = require("../models/response");

function createCrudController({
  Model,
  idField,
  resourceLabel,
  validateBody,
  buildCreatePayload,
  buildUpdatePayload,
  order
}) {
  const sortOrder = order || [[idField, "ASC"]];

  async function list(req, res) {
    const records = await Model.findAll({ order: sortOrder });
    return res.status(200).json(successResponse(records.map(plain)));
  }

  async function getById(req, res) {
    const id = parseId(req.params.id);

    if (id === null) {
      return validationError(res, `${resourceLabel} id must be a valid number.`, {
        id: req.params.id
      });
    }

    const record = await Model.findByPk(id);
    if (!record) {
      return notFound(res, `${resourceLabel} was not found.`, {
        [idField]: id
      });
    }

    return res.status(200).json(successResponse(plain(record)));
  }

  async function create(req, res) {
    const validationDetails = validateBody(req.body);

    if (validationDetails) {
      return validationError(res, `${resourceLabel} request body is invalid.`, validationDetails);
    }

    const record = await Model.create(buildCreatePayload(req.body));
    return res.status(201).json(successResponse(plain(record)));
  }

  async function update(req, res) {
    const id = parseId(req.params.id);

    if (id === null) {
      return validationError(res, `${resourceLabel} id must be a valid number.`, {
        id: req.params.id
      });
    }

    const validationDetails = validateBody(req.body);
    if (validationDetails) {
      return validationError(res, `${resourceLabel} request body is invalid.`, validationDetails);
    }

    const record = await Model.findByPk(id);
    if (!record) {
      return notFound(res, `${resourceLabel} was not found.`, {
        [idField]: id
      });
    }

    await record.update(buildUpdatePayload(req.body));
    return res.status(200).json(successResponse(plain(record)));
  }

  async function remove(req, res) {
    const id = parseId(req.params.id);

    if (id === null) {
      return validationError(res, `${resourceLabel} id must be a valid number.`, {
        id: req.params.id
      });
    }

    const record = await Model.findByPk(id);
    if (!record) {
      return notFound(res, `${resourceLabel} was not found.`, {
        [idField]: id
      });
    }

    const deletedRecord = plain(record);
    await record.destroy();
    return res.status(200).json(successResponse(deletedRecord));
  }

  return {
    list: asyncHandler(list),
    getById: asyncHandler(getById),
    create: asyncHandler(create),
    update: asyncHandler(update),
    remove: asyncHandler(remove)
  };
}

module.exports = createCrudController;
