import type { MessageItem } from "@/src/lib/messages/message-data";
import { formatMessageTimestamp } from "@/src/lib/messages/message-labels";

// One message bubble, aligned right for the viewer's own messages and left
// for the other participant's. Plain text only — whitespace-pre-wrap keeps
// line breaks the writer chose without ever interpreting markup.
export function MessageBubble({ message }: { message: MessageItem }) {
  return (
    <div className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          message.isOwn
            ? "bg-[#263b2d] text-white"
            : "border border-[#e0dacd] bg-white text-[#1d2420]"
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {message.body}
        </p>
        <p
          className={`mt-1 text-right text-[10px] ${
            message.isOwn ? "text-white/70" : "text-[#7a8378]"
          }`}
        >
          {formatMessageTimestamp(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
