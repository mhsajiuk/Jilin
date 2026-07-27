from pathlib import Path
import unittest


HTML_PATH = Path(__file__).resolve().parents[1] / "index.html"


class ChatbotWidgetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = HTML_PATH.read_text(encoding="utf-8")

    def test_has_floating_chat_toggle(self):
        self.assertIn('id="chatbot-toggle"', self.html)
        self.assertIn('aria-label="Buka chat bantuan"', self.html)

    def test_has_accessible_chat_panel(self):
        self.assertIn('id="chatbot-panel"', self.html)
        self.assertIn('role="dialog"', self.html)
        self.assertIn('aria-modal="false"', self.html)

    def test_provides_local_faq_data_without_api(self):
        self.assertIn('const faqEntries = [', self.html)
        self.assertGreaterEqual(self.html.count('question:'), 5)
        self.assertNotIn('fetch(', self.html)

    def test_supports_quick_answers_and_free_text_matching(self):
        self.assertIn('id="chatbot-quick-questions"', self.html)
        self.assertIn('id="chatbot-input"', self.html)
        self.assertIn('findFaqAnswer', self.html)

    def test_simulates_typing_indicator(self):
        self.assertIn('chatbot-message-typing', self.html)
        self.assertIn('setTimeout', self.html)



if __name__ == "__main__":
    unittest.main()
