package lifeos_backend.controller;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PasswordResetSenderTest {

    private static final String TEST_SENDER = "LifeOS Health <onboarding@resend.dev>";

    @Test
    void usesTheConfiguredSender() {
        assertEquals("LifeOS Health <noreply@lifeoshealth.com>",
                PasswordResetController.senderOrDefault(" LifeOS Health <noreply@lifeoshealth.com> "));
        assertEquals("noreply@lifeoshealth.com", PasswordResetController.senderOrDefault("noreply@lifeoshealth.com"));
    }

    @Test
    void fallsBackToTheTestSenderWhenMissingOrMalformed() {
        assertEquals(TEST_SENDER, PasswordResetController.senderOrDefault(null));
        assertEquals(TEST_SENDER, PasswordResetController.senderOrDefault(""));
        assertEquals(TEST_SENDER, PasswordResetController.senderOrDefault("not an email"));
        // header injection attempt
        assertEquals(TEST_SENDER, PasswordResetController.senderOrDefault("a@b.com\r\nBcc: x@y.com"));
    }
}
