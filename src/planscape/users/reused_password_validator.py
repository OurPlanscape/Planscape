from password_policies.password_validation import ReusedPasswordValidator


class CustomReusedPasswordValidator(ReusedPasswordValidator):
    # This is just replacing the Chinese text from the password_policies library
    def get_help_text(self):
        return f"Your password cannot match any of your {self.record_length} previously used passwords."
