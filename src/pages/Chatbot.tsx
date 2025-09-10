import React, { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import { Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! How can I assist you today?" }
  ]);
  const [input, setInput] = useState("");

  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("chatBtnPosition");
    if (saved) {
      setPosition(JSON.parse(saved));
    } else {
      setPosition({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
    }
  }, []);

  const toggleChat = () => setIsOpen((prev) => !prev);

  const handleSend = () => {
    if (!input.trim()) return;

    const newUserMsg = { from: "user", text: input };
    const newBotMsg = {
      from: "bot",
      text: "This is a dummy response. You can connect me to an AI API!"
    };

    setMessages((prev) => [...prev, newUserMsg, newBotMsg]);
    setInput("");
  };

  const handleDrag = (_e: any, data: any) => {
    const newPos = { x: data.x, y: data.y };
    setPosition(newPos);
    localStorage.setItem("chatBtnPosition", JSON.stringify(newPos));
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999]">
      {/* Toggle Button */}
      <Draggable nodeRef={nodeRef} position={position} onDrag={handleDrag}>
        <div ref={nodeRef} className="absolute pointer-events-auto">
          <Button
            onClick={toggleChat}
            className="rounded-full w-14 h-14 p-0 shadow-lg"
            variant="secondary"
          >
            <Bot className="w-6 h-6" />
          </Button>
        </div>
      </Draggable>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-5 pointer-events-auto">
          <Card className="w-80 h-[400px] flex flex-col shadow-2xl">
            <CardHeader className="flex justify-between items-center border-b px-4 py-2">
              <span className="font-semibold text-lg">Assistant</span>
              <Button variant="ghost" size="icon" onClick={toggleChat}>
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`text-sm p-2 rounded-lg max-w-[80%] ${
                    msg.from === "bot"
                      ? "bg-gray-100 text-gray-800 self-start"
                      : "bg-primary text-white self-end ml-auto"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </CardContent>
            <div className="border-t p-2 flex gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button onClick={handleSend}>Send</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
