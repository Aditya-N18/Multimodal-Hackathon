/**
 * Normalize Vapi tool-calls into a consistent internal shape.
 *
 * Official docs (https://docs.vapi.ai/server-url/events):
 *   message.type === "tool-calls"
 *   message.toolCallList[]: { id, name, parameters }
 *   Response: { results: [{ toolCallId, result }] } — result/error are strings, HTTP 200 always.
 *
 * Live Vapi Custom Tools may nest the name/args under `function`:
 *   toolCallList[]: { id, function: { name, arguments } }
 *
 * Some payloads also use `arguments` instead of `parameters`, or nest calls under toolWithToolCallList.
 */

function parseArguments(raw) {
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

function normalizeToolCallEntry(toolCall) {
  if (!toolCall) return null;

  const fn = toolCall.function;
  const id = toolCall.id ?? toolCall.toolCallId;
  const name = toolCall.name ?? fn?.name;
  const arguments_ = parseArguments(
    fn?.arguments ??
      fn?.parameters ??
      toolCall.parameters ??
      toolCall.arguments
  );

  if (!id || !name) return null;

  return { id, name, arguments: arguments_ };
}

export function extractToolCalls(body) {
  const message = body?.message;
  if (!message) return [];

  if (Array.isArray(message.toolCallList) && message.toolCallList.length > 0) {
    return message.toolCallList.map(normalizeToolCallEntry).filter(Boolean);
  }

  if (Array.isArray(message.toolWithToolCallList)) {
    return message.toolWithToolCallList
      .map((entry) => {
        const toolCall = entry.toolCall;
        if (!toolCall?.id) return null;
        const fn = toolCall.function;
        return {
          id: toolCall.id,
          name: fn?.name ?? entry.name,
          arguments: parseArguments(
            fn?.arguments ?? toolCall.parameters ?? toolCall.arguments
          ),
        };
      })
      .filter(Boolean);
  }

  return [];
}

export function vapiSuccess(toolCallId, payload) {
  const result =
    typeof payload === 'string' ? payload : JSON.stringify(payload);
  return { toolCallId, result };
}

export function vapiError(toolCallId, message) {
  return { toolCallId, error: String(message) };
}
