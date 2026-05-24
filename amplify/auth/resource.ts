import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure the Cognito auth resource
 * @see https://docs.amplify.aws/react/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
