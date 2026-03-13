from collections import deque

class ConversationMemory:
    def __init__(self, max_turns=5):
        self.history = deque(maxlen=max_turns)

    def add(self, user, assistant):
        self.history.append((user, assistant))

    def get_context(self):
        context = ""
        for u, a in self.history:
            context += f"User: {u}\nAssistant: {a}\n"
        return context


class SemanticMemory:
    def __init__(self):
        self.facts = []

    def add_fact(self, text):
        self.facts.append(text)

    def get_facts(self):
        return "\n".join(self.facts)