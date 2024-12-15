import { mailtrapclient, sender } from './mailtrap.config.js';
import {
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
} from './emailTemplates.js';

export const sendVerificationEmail = async (email, verificationToken) => {
  const receipient = [{ email }];

  try {
    const response = await mailtrapclient.send({
      from: sender,
      to: receipient,
      template_uuid: process.env.MAILTRAP_VERIFICATION_TEMPLATE_UUID,
      template_variables: {
        verificationCode: verificationToken,
      },
    });
    console.log('Email sent successfully', response);
  } catch (error) {
    console.error(`Error sending verification email: ${error}`);
    throw new Error(`Error sending verification email: ${error}`);
  }
};

export const sendWelcomeEmail = async (email, name) => {
  const recipient = [{ email }];
  try {
    const response = await mailtrapclient.send({
      from: sender,
      to: recipient,
      template_uuid: process.env.MAILTRAP_WELCOME_TEMPLATE_UUID,
      template_variables: {
        user_name: name,
        login_url: `${process.env.CLIENT_URL}/signin`,
      },
    });
    console.log('Email sent successfully', response);
  } catch (error) {
    console.error(`Error sending welcome email: ${error}`);
    throw new Error(`Error sending welcome email: ${error}`);
  }
};

export const sendPasswordResetEmail = async (email, url) => {
  const recipient = [{ email }];
  try {
    const response = await mailtrapclient.send({
      from: sender,
      to: recipient,
      subject: 'Reset your password',
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace('{resetURL}', url),
      category: 'Password Reset',
    });
    // console.log('Email sent successfully', response);
  } catch (error) {
    console.error(`Error sending reset password email: ${error}`);
    throw new Error(`Error sending reset password email: ${error}`);
  }
};

export const sendResetSuccessEmail = async (email, url) => {
  const recipient = [{ email }];
  try {
    const response = await mailtrapclient.send({
      from: sender,
      to: recipient,
      subject: 'Password Reset Successful',
      html: PASSWORD_RESET_SUCCESS_TEMPLATE,
      category: 'Password Reset Success',
    });
    // console.log('Email sent successfully', response);
  } catch (error) {
    console.error(`Error sending reset password email: ${error}`);
    throw new Error(`Error sending reset password email: ${error}`);
  }
};
