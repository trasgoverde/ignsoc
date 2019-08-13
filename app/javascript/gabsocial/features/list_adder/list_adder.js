import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { defineMessages, injectIntl } from 'react-intl';
import { createSelector } from 'reselect';
import { setupListAdder, resetListAdder } from '../../actions/lists';
import List from './components/list';
import Account from '../../components/account';
import IconButton from '../../components/icon_button';
import NewListForm from '../lists/components/new_list_form';
import ColumnSubheading from '../../components/column_subheading/column_subheading';

import './list_adder.scss';

const getOrderedLists = createSelector([state => state.get('lists')], lists => {
  if (!lists) {
    return lists;
  }

  return lists.toList().filter(item => !!item).sort((a, b) => a.get('title').localeCompare(b.get('title')));
});

const mapStateToProps = (state, { accountId }) => ({
  listIds: getOrderedLists(state).map(list => list.get('id')),
  account: state.getIn(['accounts', accountId]),
});

const mapDispatchToProps = dispatch => ({
  onInitialize: accountId => dispatch(setupListAdder(accountId)),
  onReset: () => dispatch(resetListAdder()),
});

const messages = defineMessages({
  close: { id: 'lightbox.close', defaultMessage: 'Close' },
  subheading: { id: 'lists.subheading', defaultMessage: 'Your lists' },
  add: { id: 'lists.new.create', defaultMessage: 'Add List' },
  headerTitle: { id: 'list_adder.header_title', defaultMessage: 'Add or Remove from Lists' },
});

export default @connect(mapStateToProps, mapDispatchToProps)
@injectIntl
class ListAdder extends ImmutablePureComponent {

  static propTypes = {
    accountId: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    onInitialize: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    listIds: ImmutablePropTypes.list.isRequired,
    account: ImmutablePropTypes.map.isRequired,
  };

  componentDidMount() {
    const { onInitialize, accountId } = this.props;
    onInitialize(accountId);
  }

  componentWillUnmount() {
    const { onReset } = this.props;
    onReset();
  }

  onClickClose = () => {
    this.props.onClose('LIST_ADDER');
  };

  render() {
    const { listIds, intl, account } = this.props;

    return (
      <div className='modal-root__modal compose-modal'>
        <div className='compose-modal__header'>
          <h3 className='compose-modal__header__title'>{intl.formatMessage(messages.headerTitle)}</h3>
          <IconButton className='compose-modal__close' title={intl.formatMessage(messages.close)} icon='times' onClick={this.onClickClose} size={20} />
        </div>
        <div className='compose-modal__content'>
          <div className='list-adder'>
            <div className='list-adder__account'>
              <Account account={account} displayOnly/>
            </div>

            <br />

            <ColumnSubheading text={intl.formatMessage(messages.add)} />
            <NewListForm />

            <br />

            <ColumnSubheading text={intl.formatMessage(messages.subheading)} />
            <div className='list-adder__lists'>
              {listIds.map(ListId => <List key={ListId} listId={ListId} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

}