import { OtherProductParam, ProductParam, otherProductParamValues } from '@proton/shared/lib/apps/product';
import {
    ADDON_NAMES,
    APP_NAMES,
    CYCLE,
    DEFAULT_CYCLE,
    MAX_DOMAIN_PRO_ADDON,
    MAX_IPS_ADDON,
    MAX_MEMBER_ADDON,
    MEMBER_ADDON_PREFIX,
    PLANS,
    PLAN_TYPES,
} from '@proton/shared/lib/constants';
import { getSupportedAddons } from '@proton/shared/lib/helpers/planIDs';
import { getValidCycle } from '@proton/shared/lib/helpers/subscription';
import { Currency, Plan, getPlanMaxIPs } from '@proton/shared/lib/interfaces';
import clamp from '@proton/utils/clamp';

import { addonLimit } from '../single-signup/planCustomizer/PlanCustomizer';
import { SERVICES } from './interfaces';

export const getProduct = (maybeProduct: string | undefined): APP_NAMES | undefined => {
    return maybeProduct ? SERVICES[maybeProduct] : undefined;
};

const getDefaultProductParam = (): 'generic' => {
    return 'generic';
};

const productParams = new Set(otherProductParamValues);

const getSanitisedProductParam = (value: string | undefined): OtherProductParam | undefined => {
    if (productParams.has(value as any)) {
        return value as OtherProductParam;
    }
};

export const getProductParam = (product: APP_NAMES | undefined, productParam: string | undefined): ProductParam => {
    const sanitisedProductParam = getSanitisedProductParam(productParam);
    const defaultProductParam = getDefaultProductParam();
    return product || sanitisedProductParam || defaultProductParam;
};

export const getProductParams = (pathname: string, searchParams: URLSearchParams) => {
    const maybeProductPathname = pathname.match(/\/([^/]*)/)?.[1];
    const maybeProductParam = (searchParams.get('service') || searchParams.get('product') || undefined)?.toLowerCase();
    const product = getProduct(maybeProductPathname) || getProduct(maybeProductParam);
    const productParam = getProductParam(product, maybeProductParam || maybeProductPathname);
    return { product, productParam };
};

export const getSignupSearchParams = (
    pathname: string,
    searchParams: URLSearchParams,
    defaults?: { cycle?: CYCLE; preSelectedPlan?: PLANS }
) => {
    const maybeCurrency = searchParams.get('currency')?.toUpperCase() as Currency | undefined;
    const currency = maybeCurrency && ['EUR', 'CHF', 'USD'].includes(maybeCurrency) ? maybeCurrency : undefined;

    const maybeCycle = Number(searchParams.get('billing')) || Number(searchParams.get('cycle'));
    const cycle = getValidCycle(maybeCycle);

    const maybeMinimumCycle = Number(searchParams.get('minimumCycle'));
    const minimumCycle = getValidCycle(maybeMinimumCycle);

    const maybeUsers = Number(searchParams.get('users'));
    const users = maybeUsers >= 1 && maybeUsers <= MAX_MEMBER_ADDON ? maybeUsers : undefined;
    const maybeDomains = Number(searchParams.get('domains'));
    const domains = maybeDomains >= 1 && maybeDomains <= MAX_DOMAIN_PRO_ADDON ? maybeDomains : undefined;
    const maybeIps = Number(searchParams.get('ips'));
    const ips = maybeIps >= 1 && maybeIps <= MAX_IPS_ADDON ? maybeIps : undefined;

    const { product } = getProductParams(pathname, searchParams);

    // plan is validated by comparing plans after it's loaded
    const maybePreSelectedPlan = searchParams.get('plan');
    // static sites use 'business' for pro plan
    const preSelectedPlan = maybePreSelectedPlan === 'business' ? 'professional' : maybePreSelectedPlan;

    const referrer = searchParams.get('referrer') || undefined; // referral ID
    const invite = searchParams.get('invite') || undefined;
    const coupon = searchParams.get('coupon') || undefined;
    const type = searchParams.get('type') || undefined;
    const hideFreePlan = searchParams.get('hfp') || undefined;
    const email = searchParams.get('email') || undefined;
    const orgName = searchParams.get('orgName') || undefined;

    return {
        email,
        coupon,
        currency,
        cycle: cycle || defaults?.cycle || DEFAULT_CYCLE,
        minimumCycle,
        preSelectedPlan: preSelectedPlan || defaults?.preSelectedPlan,
        product,
        users,
        domains,
        ips,
        referrer,
        invite,
        type,
        hideFreePlan: hideFreePlan === 'true',
        orgName,
    };
};
export type SignupParameters = ReturnType<typeof getSignupSearchParams>;

export const getPlanIDsFromParams = (plans: Plan[], signupParameters: SignupParameters) => {
    if (!signupParameters.preSelectedPlan) {
        return;
    }

    if (signupParameters.preSelectedPlan === 'free') {
        return {};
    }

    const plan = plans.find(({ Name, Type }) => {
        return Name === signupParameters.preSelectedPlan && Type === PLAN_TYPES.PLAN;
    });

    if (!plan) {
        return;
    }

    const planIDs = { [plan.Name]: 1 };
    const supportedAddons = getSupportedAddons(planIDs);

    if (signupParameters.users !== undefined) {
        const usersAddon = plans.find(
            ({ Name }) => Name.startsWith(MEMBER_ADDON_PREFIX) && supportedAddons[Name as keyof typeof supportedAddons]
        );

        const clampedUsers = clamp(
            signupParameters.users,
            0,
            usersAddon ? addonLimit[usersAddon.Name as ADDON_NAMES] : 0
        );
        const amount = clampedUsers - plan.MaxMembers;
        if (usersAddon && amount > 0) {
            planIDs[usersAddon.Name] = amount;
        }
    }

    if (signupParameters.domains !== undefined) {
        const domainsAddon = plans.find(
            ({ Name }) => Name.startsWith('1domain') && supportedAddons[Name as keyof typeof supportedAddons]
        );
        const amount = signupParameters.domains - plan.MaxDomains;
        if (domainsAddon && amount > 0) {
            planIDs[domainsAddon.Name] = amount;
        }
    }

    if (signupParameters.ips !== undefined) {
        const ipsAddon = plans.find(
            ({ Name }) => Name.startsWith('1ip') && supportedAddons[Name as keyof typeof supportedAddons]
        );
        const amount = signupParameters.ips - (getPlanMaxIPs(plan) + (ipsAddon?.Quantity || 0));
        if (ipsAddon && amount > 0) {
            planIDs[ipsAddon.Name] = amount;
        }
    }

    return planIDs;
};
