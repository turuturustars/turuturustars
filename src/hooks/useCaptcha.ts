export const useCaptcha = () => {
  // Captcha integration is currently disabled. Provide safe placeholders.
  const captchaToken = null as string | null;
  const error = null as string | null;

  const renderCaptcha = (_containerId?: string) => {
    // no-op placeholder
  };

  const resetCaptcha = (_containerId?: string) => {
    // no-op placeholder
  };

  const removeCaptcha = (_containerId?: string) => {
    // no-op placeholder
  };

  return {
    captchaToken,
    error,
    renderCaptcha,
    resetCaptcha,
    removeCaptcha,
  };
};
