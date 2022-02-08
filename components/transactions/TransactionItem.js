import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from '@styled-icons/feather/ChevronDown';
import { ChevronUp } from '@styled-icons/feather/ChevronUp';
import { MessageSquare } from '@styled-icons/feather/MessageSquare';
import { truncate } from 'lodash';
import { FormattedMessage, useIntl } from 'react-intl';
import styled from 'styled-components';

import expenseStatus from '../../lib/constants/expense-status';
import { TransactionKind, TransactionTypes } from '../../lib/constants/transactions';
import { formatCurrency } from '../../lib/currency-utils';
import { i18nTransactionKind, i18nTransactionType } from '../../lib/i18n/transaction';
import { getCollectivePageRoute } from '../../lib/url-helpers';

import Avatar from '../Avatar';
import { CreditItem, DebitItem } from '../budget/DebitCreditList';
import Container from '../Container';
import DateTime from '../DateTime';
import DefinedTerm, { Terms } from '../DefinedTerm';
import ExpenseStatusTag from '../expenses/ExpenseStatusTag';
import ExpenseTags from '../expenses/ExpenseTags';
import { Box, Flex } from '../Grid';
import PrivateInfoIcon from '../icons/PrivateInfoIcon';
import Link from '../Link';
import LinkCollective from '../LinkCollective';
import StyledButton from '../StyledButton';
import StyledLink from '../StyledLink';
import StyledTag from '../StyledTag';
import StyledTooltip from '../StyledTooltip';
import { P, Span } from '../Text';
import TransactionSign from '../TransactionSign';
import TransactionStatusTag from '../TransactionStatusTag';
import { useUser } from '../UserProvider';

import TransactionDetails from './TransactionDetails';

const { CONTRIBUTION, ADDED_FUNDS } = TransactionKind;

/** To separate individual information below description */
const INFO_SEPARATOR = ' • ';

const getDisplayedAmount = (transaction, collective) => {
  const isCredit = transaction.type === TransactionTypes.CREDIT;
  const hasOrder = transaction.order !== null;
  const isSelf = transaction.fromAccount.slug === collective.slug;

  if (isCredit && hasOrder) {
    // Credit from donations should display the full amount donated by the user
    return transaction.amount;
  } else if (!isCredit && !hasOrder) {
    // Expense Debits should display the Amount with Payment Method fees only on collective's profile
    return isSelf ? transaction.netAmount : transaction.amount;
  } else if (transaction.isRefunded) {
    if ((isSelf && !transaction.isRefund) || (transaction.isRefund && isCredit)) {
      return transaction.netAmount;
    } else {
      return transaction.amount;
    }
  } else {
    return transaction.netAmount;
  }
};

const ItemTitleWrapper = ({ expense, children }) => {
  if (expense) {
    return (
      <StyledTooltip
        content={<FormattedMessage id="Expense.GoToPage" defaultMessage="Go to expense page" />}
        delayHide={0}
      >
        <StyledLink
          as={Link}
          underlineOnHover
          href={`${getCollectivePageRoute(expense.account)}/expenses/${expense.legacyId}`}
        >
          {children}
        </StyledLink>
      </StyledTooltip>
    );
  } else {
    return <React.Fragment>{children}</React.Fragment>;
  }
};

ItemTitleWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  expense: PropTypes.shape({
    legacyId: PropTypes.number,
    account: PropTypes.shape({
      slug: PropTypes.string,
    }),
  }),
};

const KindTag = styled(StyledTag).attrs({
  variant: 'rounded-left',
  type: 'grey',
  mb: '4px',
  mr: '10px',
  textTransform: 'uppercase',
  fontSize: '10px',
  fontWeight: '600',
})``;

const getExpenseStatusTag = (status, isRefund, isRefunded) => {
  let expenseStatusLabel;
  if (isRefunded) {
    expenseStatusLabel = expenseStatus.REFUNDED;
  } else if (isRefund) {
    expenseStatusLabel = expenseStatus.COMPLETED;
  } else {
    expenseStatusLabel = status;
  }
  return <ExpenseStatusTag status={expenseStatusLabel} fontSize="9px" px="6px" py="2px" />;
};

const TransactionItem = ({ displayActions, collective, transaction, onMutationSuccess }) => {
  const {
    toAccount,
    fromAccount,
    giftCardEmitterAccount,
    order,
    expense,
    type,
    description,
    createdAt,
    isRefunded,
    isRefund,
    isOrderRejected,
  } = transaction;

  const { LoggedInUser } = useUser();
  const [isExpanded, setExpanded] = React.useState(false);
  const intl = useIntl();

  const hasOrder = order !== null;
  const hasExpense = expense !== null;
  const isCredit = type === TransactionTypes.CREDIT;
  const Item = isCredit ? CreditItem : DebitItem;
  const legacyCollectiveId = collective.legacyId || collective.id;
  const isOwnUserProfile = LoggedInUser && LoggedInUser.CollectiveId === legacyCollectiveId;
  const avatarCollective = isCredit ? fromAccount : toAccount;

  const displayedAmount = getDisplayedAmount(transaction, collective);

  return (
    <Item data-cy="transaction-item">
      <Box px={[16, 27]} py={16}>
        <Flex flexWrap="wrap" justifyContent="space-between">
          <Flex flex="1" minWidth="60%" mr={3}>
            <Box mr={3}>
              <LinkCollective collective={avatarCollective}>
                <Avatar collective={avatarCollective} radius={40} />
              </LinkCollective>
            </Box>
            <Box>
              <Container
                data-cy="transaction-description"
                fontWeight="500"
                fontSize={['14px', null, null, '16px']}
                lineHeight={['20px', null, null, '24px']}
              >
                <ItemTitleWrapper expense={expense}>
                  <Span title={description} color={description ? 'black.900' : 'black.600'}>
                    {description ? (
                      truncate(description, { length: 60 })
                    ) : (
                      <FormattedMessage id="NoDescription" defaultMessage="No description provided" />
                    )}
                  </Span>
                </ItemTitleWrapper>
                {isOwnUserProfile && transaction.fromAccount?.isIncognito && (
                  <Span ml={1} css={{ verticalAlign: 'text-bottom' }}>
                    <PrivateInfoIcon color="#969BA3">
                      <FormattedMessage
                        id="PrivateTransaction"
                        defaultMessage="This incognito transaction is only visible to you"
                      />
                    </PrivateInfoIcon>
                  </Span>
                )}
              </Container>
              <P mt="4px" fontSize="12px" lineHeight="20px" color="black.700" data-cy="transaction-details">
                {i18nTransactionType(intl, transaction.type)}
                &nbsp;
                {
                  <Fragment>
                    <FormattedMessage
                      id="Transaction.from"
                      defaultMessage="from {name}"
                      values={{ name: <StyledLink as={LinkCollective} collective={fromAccount} /> }}
                    />
                    &nbsp;
                  </Fragment>
                }
                {
                  <FormattedMessage
                    id="Transaction.to"
                    defaultMessage="to {name}"
                    values={{ name: <StyledLink as={LinkCollective} collective={toAccount} /> }}
                  />
                }
                {giftCardEmitterAccount && (
                  <React.Fragment>
                    &nbsp;
                    <FormattedMessage
                      id="transaction.usingGiftCardFrom"
                      defaultMessage="using a {giftCard} from {collective}"
                      values={{
                        giftCard: <DefinedTerm term={Terms.GIFT_CARD} textTransform="lowercase" />,
                        collective: <StyledLink as={LinkCollective} collective={giftCardEmitterAccount} />,
                      }}
                    />
                  </React.Fragment>
                )}
                {INFO_SEPARATOR}
                <DateTime value={createdAt} data-cy="transaction-date" />
                {hasExpense && expense.comments?.totalCount > 0 && (
                  <React.Fragment>
                    {INFO_SEPARATOR}
                    <span>
                      <MessageSquare size="16px" />
                      &nbsp;
                      {expense.comments.totalCount}
                    </span>
                  </React.Fragment>
                )}
              </P>
            </Box>
          </Flex>
          <Flex flexDirection={['row', 'column']} mt={[3, 0]} flexWrap="wrap" alignItems={['center', 'flex-end']}>
            <Container
              display="flex"
              my={2}
              mr={[3, 0]}
              minWidth={100}
              justifyContent="flex-end"
              data-cy="transaction-amount"
              fontSize="16px"
              ml="auto"
            >
              <TransactionSign isCredit={isCredit} />
              <Span fontWeight="bold" color="black.900" mr={1}>
                {formatCurrency(Math.abs(displayedAmount.valueInCents), displayedAmount.currency, {
                  locale: intl.locale,
                })}
              </Span>
              <Span color="black.700" textTransform="uppercase">
                {displayedAmount.currency}
              </Span>
            </Container>
            {hasOrder && (
              <TransactionStatusTag
                isRefund={isRefund}
                isRefunded={isRefunded}
                isOrderRejected={isOrderRejected}
                fontSize="9px"
                px="6px"
                py="2px"
              />
            )}{' '}
            {hasExpense && getExpenseStatusTag(expense.status, isRefund, isRefunded)}
          </Flex>
        </Flex>
        {hasOrder && [CONTRIBUTION, ADDED_FUNDS].includes(transaction.kind) && (
          <Container borderTop={['1px solid #E8E9EB', 'none']} mt={3} pt={[2, 0]}>
            {[CONTRIBUTION, ADDED_FUNDS].includes(transaction.kind) && (
              <KindTag>{i18nTransactionKind(intl, transaction.kind)}</KindTag>
            )}
            <StyledButton
              data-cy="transaction-details"
              buttonSize="tiny"
              buttonStyle="secondary"
              isBorderless
              onClick={() => setExpanded(!isExpanded)}
            >
              <Span whiteSpace="nowrap">
                {isExpanded ? (
                  <React.Fragment>
                    <FormattedMessage id="closeDetails" defaultMessage="Close Details" />
                    &nbsp;
                    <ChevronUp size="1em" />
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <Span whiteSpace="nowrap">
                      <FormattedMessage id="viewDetails" defaultMessage="View Details" />
                      &nbsp;
                      <ChevronDown size="1em" />
                    </Span>
                  </React.Fragment>
                )}
              </Span>
            </StyledButton>
          </Container>
        )}
        {hasExpense && (
          <Container mt={3} pt={[2, 0]}>
            <ExpenseTags expense={expense} />
          </Container>
        )}
        {!hasExpense && (!hasOrder || ![CONTRIBUTION, ADDED_FUNDS].includes(transaction.kind)) && (
          <Container mt={3} pt={[2, 0]}>
            <KindTag>{i18nTransactionKind(intl, transaction.kind)}</KindTag>
          </Container>
        )}
      </Box>
      {isExpanded && hasOrder && (
        <TransactionDetails
          displayActions={displayActions}
          transaction={transaction}
          onMutationSuccess={onMutationSuccess}
        />
      )}
    </Item>
  );
};

TransactionItem.propTypes = {
  /* Display Refund and Download buttons in transactions */
  displayActions: PropTypes.bool,
  transaction: PropTypes.shape({
    isRefunded: PropTypes.bool,
    isRefund: PropTypes.bool,
    isOrderRejected: PropTypes.bool,
    fromAccount: PropTypes.shape({
      id: PropTypes.string,
      slug: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      imageUrl: PropTypes.string,
      isIncognito: PropTypes.bool,
    }).isRequired,
    host: PropTypes.shape({
      id: PropTypes.string,
      slug: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      imageUrl: PropTypes.string,
    }),
    toAccount: PropTypes.shape({
      id: PropTypes.string,
      slug: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      imageUrl: PropTypes.string,
    }),
    giftCardEmitterAccount: PropTypes.shape({
      id: PropTypes.string,
      slug: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      imageUrl: PropTypes.string,
    }),
    order: PropTypes.shape({
      id: PropTypes.string,
      status: PropTypes.string,
    }),
    expense: PropTypes.shape({
      id: PropTypes.string,
      status: PropTypes.string,
      legacyId: PropTypes.number,
      comments: PropTypes.shape({
        totalCount: PropTypes.number,
      }),
    }),
    id: PropTypes.string,
    uuid: PropTypes.string,
    type: PropTypes.oneOf(Object.values(TransactionTypes)),
    kind: PropTypes.oneOf(Object.values(TransactionKind)),
    currency: PropTypes.string,
    description: PropTypes.string,
    createdAt: PropTypes.string,
    hostFeeInHostCurrency: PropTypes.number,
    platformFeeInHostCurrency: PropTypes.number,
    paymentProcessorFeeInHostCurrency: PropTypes.number,
    taxAmount: PropTypes.object,
    amount: PropTypes.shape({
      valueInCents: PropTypes.number,
      currency: PropTypes.string,
    }),
    netAmount: PropTypes.shape({
      valueInCents: PropTypes.number,
      currency: PropTypes.string,
    }),
    netAmountInCollectiveCurrency: PropTypes.number,
    refundTransaction: PropTypes.object,
    usingGiftCardFromCollective: PropTypes.object,
  }),
  collective: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    legacyId: PropTypes.number,
    slug: PropTypes.string.isRequired,
  }).isRequired,
  onMutationSuccess: PropTypes.func,
};

export default TransactionItem;
