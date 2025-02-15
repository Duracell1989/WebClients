/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Measures the total number of subscriptions
 */
export interface WebPaymentsSubscriptionTotal {
  Value: number;
  Labels: {
    status: "success" | "failure" | "4xx" | "5xx";
    source:
      | "dashboard"
      | "plans"
      | "lite-subscribe"
      | "lite-vpn-bf"
      | "subscription-section"
      | "upsells"
      | "vpn-get-more"
      | "vpn-um-get-more"
      | "automatic";
    application: "proton-vpn-settings" | "proton-account" | "proton-account-lite";
    fromPlan: "free" | "paid";
    step:
      | "network-error"
      | "plan-selection"
      | "customization"
      | "checkout"
      | "checkout-with-customization"
      | "upgrade"
      | "thanks";
  };
}
