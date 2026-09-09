// ============================================================
// RAG CONTEXT BUILDER
// ============================================================

const MAX_CONTEXT_CHARS = 30000;

// ============================================================
// NORMALIZE TEXT
// ============================================================

function normalizeText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value).trim();
}

// ============================================================
// BUILD CONTEXT STRING
// ============================================================

export function buildContextString(context) {
  if (
    !Array.isArray(context) ||
    context.length === 0
  ) {
    return '';
  }

  let result = '';

  for (
    let index = 0;
    index < context.length;
    index++
  ) {
    const item = context[index];

    if (!item?.content) {
      continue;
    }

    const section = [
      `[Document ${index + 1}]`,

      `Title: ${
        normalizeText(item.documentTitle) ||
        'Unknown Document'
      }`,

      `File: ${
        normalizeText(item.fileName) ||
        'Unknown File'
      }`,

      `Chunk: ${
        item.chunkIndex ?? 'N/A'
      }`,

      '',

      item.content,
    ].join('\n');

    const candidate = result
      ? `${result}\n\n--------------------\n\n${section}`
      : section;

    // --------------------------------------------------------
    // Prevent excessively large context
    // --------------------------------------------------------

    if (
      candidate.length >
      MAX_CONTEXT_CHARS
    ) {
      break;
    }

    result = candidate;
  }

  return result.trim();
}

// ============================================================
// GET MAX CONTEXT SIZE
// ============================================================

export function getMaxContextChars() {
  return MAX_CONTEXT_CHARS;
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  buildContextString,
  getMaxContextChars,
};