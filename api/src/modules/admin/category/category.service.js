// Business logic for categories. Throws ApiError on rule violations.
const ApiError = require('../../../utils/ApiError');
const slugify = require('../../../utils/slugify');
const { removeUploadedFile } = require('../../../utils/file');
const categoryRepository = require('./category.repository');

// Turns a given slug (or the name, when no slug is sent) into a URL-safe slug.
function toSlug(value) {
  const slug = slugify(value);
  if (!slug) {
    throw ApiError.badRequest('Validation failed', { slug: 'Slug must contain letters or numbers' });
  }
  return slug;
}

// Rejects with 409 listing every field that is already taken by another category.
async function assertUnique({ name, slug }, excludeId = null) {
  const errors = {};
  if (name !== undefined && (await categoryRepository.nameExists(name, excludeId))) {
    errors.name = 'Category name already exists';
  }
  if (slug !== undefined && (await categoryRepository.slugExists(slug, excludeId))) {
    errors.slug = 'Category slug already exists';
  }
  if (Object.keys(errors).length) {
    throw ApiError.conflict(Object.values(errors).join(', '), errors);
  }
}

// Two requests can pass assertUnique at the same time; the DB unique index catches the second.
function mapUniqueViolation(err) {
  if (err.code === '23505' && err.constraint === 'categories_slug_key') {
    return ApiError.conflict('Category slug already exists', { slug: 'Category slug already exists' });
  }
  return err;
}

async function assertParentExists(parentId) {
  if (parentId === null || parentId === undefined) return;
  const parent = await categoryRepository.findById(parentId);
  if (!parent) throw ApiError.badRequest('Parent category not found');
}

async function getOrFail(id) {
  const category = await categoryRepository.findById(id);
  if (!category) throw ApiError.notFound('Category not found');
  return category;
}

function list(filters, pagination) {
  return categoryRepository.findAll(filters, pagination);
}

// Nests the flat list under each parent's `children`.
async function tree() {
  const rows = await categoryRepository.findAllForTree();
  const byId = new Map(rows.map((row) => [row.id, { ...row, children: [] }]));
  const roots = [];
  for (const node of byId.values()) {
    const parent = node.parent_id && byId.get(node.parent_id);
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

async function create(data) {
  const slug = toSlug(data.slug || data.name);
  await assertUnique({ name: data.name, slug });
  await assertParentExists(data.parent_id);

  const id = await categoryRepository
    .create({
      parent_id: data.parent_id ?? null,
      name: data.name,
      slug,
      description: data.description ?? null,
      image: data.image ?? null,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    })
    .catch((err) => {
      throw mapUniqueViolation(err);
    });
  return categoryRepository.findById(id);
}

async function update(id, data) {
  const existing = await getOrFail(id);

  if (data.parent_id !== undefined && data.parent_id !== null) {
    await assertParentExists(data.parent_id);
    if (await categoryRepository.isSelfOrDescendant(id, data.parent_id)) {
      throw ApiError.badRequest('A category cannot be moved under itself or its own sub-category');
    }
  }

  const changes = { ...data };
  if (data.slug !== undefined) {
    changes.slug = toSlug(data.slug);
  }
  await assertUnique({ name: changes.name, slug: changes.slug }, id);

  await categoryRepository.update(id, changes).catch((err) => {
    throw mapUniqueViolation(err);
  });
  if (changes.image !== undefined && changes.image !== existing.image) {
    removeUploadedFile(existing.image);
  }
  return categoryRepository.findById(id);
}

async function setStatus(id, isActive) {
  await getOrFail(id);
  await categoryRepository.update(id, { is_active: isActive });
  return categoryRepository.findById(id);
}

async function remove(id) {
  const category = await getOrFail(id);
  if ((await categoryRepository.countChildren(id)) > 0) {
    throw ApiError.conflict('Delete or move its sub-categories first');
  }
  if ((await categoryRepository.countProducts(id)) > 0) {
    throw ApiError.conflict('Delete or move its products first');
  }
  await categoryRepository.remove(id);
  removeUploadedFile(category.image);
}

module.exports = { list, tree, getById: getOrFail, create, update, setStatus, remove };
