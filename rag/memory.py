from collections import deque

class ConversationMemory:
    def __init__(self, max_turns=5):
        self.history = deque(maxlen=max_turns)

    def add(self, query, answer):
        self.history.append((query, answer))

    def get_context(self):
        context = ""
        for q, a in self.history:
            context += f"User: {q}\nAssistant: {a}\n"
        return context