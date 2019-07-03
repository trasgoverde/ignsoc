import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import Avatar from './avatar';
import AvatarOverlay from './avatar_overlay';
import AvatarComposite from './avatar_composite';
import RelativeTimestamp from './relative_timestamp';
import DisplayName from './display_name';
import StatusContent from './status_content';
import AttachmentList from './attachment_list';
import Card from '../features/status/components/card';
import { injectIntl, FormattedMessage } from 'react-intl';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { MediaGallery, Video } from '../features/ui/util/async-components';
import classNames from 'classnames';
import Icon from 'gabsocial/components/icon';
import PollContainer from 'gabsocial/containers/poll_container';
import { displayMedia } from '../initial_state';
import { NavLink } from 'react-router-dom';

// We use the component (and not the container) since we do not want
// to use the progress bar to show download progress
import Bundle from '../features/ui/components/bundle';

export const textForScreenReader = (intl, status) => {
  const displayName = status.getIn(['account', 'display_name']);

  const values = [
    displayName.length === 0 ? status.getIn(['account', 'acct']).split('@')[0] : displayName,
    status.get('spoiler_text') && status.get('hidden') ? status.get('spoiler_text') : status.get('search_index').slice(status.get('spoiler_text').length),
    intl.formatDate(status.get('created_at'), { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
    status.getIn(['account', 'acct']),
  ];

  return values.join(', ');
};

export const defaultMediaVisibility = (status) => {
  if (!status) {
    return undefined;
  }

  if (status.get('reblog', null) !== null && typeof status.get('reblog') === 'object') {
    status = status.get('reblog');
  }

  return (displayMedia !== 'hide_all' && !status.get('sensitive') || displayMedia === 'show_all');
};

export default @injectIntl
class Status extends ImmutablePureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    status: ImmutablePropTypes.map,
    account: ImmutablePropTypes.map,
    otherAccounts: ImmutablePropTypes.list,
    onClick: PropTypes.func,
    onReply: PropTypes.func,
    onFavourite: PropTypes.func,
    onReblog: PropTypes.func,
    onDelete: PropTypes.func,
    onDirect: PropTypes.func,
    onMention: PropTypes.func,
    onPin: PropTypes.func,
    onOpenMedia: PropTypes.func,
    onOpenVideo: PropTypes.func,
    onBlock: PropTypes.func,
    onEmbed: PropTypes.func,
    onHeightChange: PropTypes.func,
    onToggleHidden: PropTypes.func,
    muted: PropTypes.bool,
    hidden: PropTypes.bool,
    unread: PropTypes.bool,
    onMoveUp: PropTypes.func,
    onMoveDown: PropTypes.func,
    showThread: PropTypes.bool,
    getScrollPosition: PropTypes.func,
    updateScrollBottom: PropTypes.func,
    cacheMediaWidth: PropTypes.func,
    cachedMediaWidth: PropTypes.number,
  };

  // Avoid checking props that are functions (and whose equality will always
  // evaluate to false. See react-immutable-pure-component for usage.
  updateOnProps = [
    'status',
    'account',
    'muted',
    'hidden',
  ];

  state = {
    showMedia: defaultMediaVisibility(this.props.status),
    statusId: undefined,
  };

  // Track height changes we know about to compensate scrolling
  componentDidMount () {
    this.didShowCard = !this.props.muted && !this.props.hidden && this.props.status && this.props.status.get('card');
  }

  getSnapshotBeforeUpdate () {
    if (this.props.getScrollPosition) {
      return this.props.getScrollPosition();
    } else {
      return null;
    }
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.status && nextProps.status.get('id') !== prevState.statusId) {
      return {
        showMedia: defaultMediaVisibility(nextProps.status),
        statusId: nextProps.status.get('id'),
      };
    } else {
      return null;
    }
  }

  // Compensate height changes
  componentDidUpdate (prevProps, prevState, snapshot) {
    const doShowCard  = !this.props.muted && !this.props.hidden && this.props.status && this.props.status.get('card');

    if (doShowCard && !this.didShowCard) {
      this.didShowCard = true;

      if (snapshot !== null && this.props.updateScrollBottom) {
        if (this.node && this.node.offsetTop < snapshot.top) {
          this.props.updateScrollBottom(snapshot.height - snapshot.top);
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.node && this.props.getScrollPosition) {
      const position = this.props.getScrollPosition();
      if (position !== null && this.node.offsetTop < position.top) {
        requestAnimationFrame(() => {
          this.props.updateScrollBottom(position.height - position.top);
        });
      }
    }
  }

  handleToggleMediaVisibility = () => {
    this.setState({ showMedia: !this.state.showMedia });
  }

  handleClick = () => {
    if (this.props.onClick) {
      this.props.onClick();
      return;
    }

    if (!this.context.router) {
      return;
    }

    const { status } = this.props;
    this.context.router.history.push(`/${status.getIn(['account', 'acct'])}/posts/${status.getIn(['reblog', 'id'], status.get('id'))}`);
  }

  handleExpandClick = (e) => {
    if (e.button === 0) {
      if (!this.context.router) {
        return;
      }

      const { status } = this.props;
      this.context.router.history.push(`/${status.getIn(['account', 'acct'])}/posts/${status.getIn(['reblog', 'id'], status.get('id'))}`);
    }
  }

  handleExpandedToggle = () => {
    this.props.onToggleHidden(this._properStatus());
  };

  renderLoadingMediaGallery () {
    return <div className='media_gallery' style={{ height: '110px' }} />;
  }

  renderLoadingVideoPlayer () {
    return <div className='media-spoiler-video' style={{ height: '110px' }} />;
  }

  handleOpenVideo = (media, startTime) => {
    this.props.onOpenVideo(media, startTime);
  }

  _properStatus () {
    const { status } = this.props;

    if (status.get('reblog', null) !== null && typeof status.get('reblog') === 'object') {
      return status.get('reblog');
    } else {
      return status;
    }
  }

  handleRef = c => {
    this.node = c;
  }

  render () {
    const { intl, hidden, featured, otherAccounts, unread, showThread } = this.props;

    let { status, account, ...other } = this.props;
    let media = null;

    if (status === null) {
      return null;
    }

    if (hidden) {
      return (
        <div ref={this.handleRef}>
          {status.getIn(['account', 'display_name']) || status.getIn(['account', 'username'])}
          {status.get('content')}
        </div>
      );
    }

    if (status.get('filtered') || status.getIn(['reblog', 'filtered'])) {
      return (
        <div className='status__wrapper status__wrapper--filtered focusable' tabIndex='0' ref={this.handleRef}>
          <FormattedMessage id='status.filtered' defaultMessage='Filtered' />
        </div>
      );
    }

    if (status.get('poll')) {
      media = <PollContainer pollId={status.get('poll')} />;
    }
    else if (status.get('media_attachments').size > 0) {
      if (this.props.muted) {
        media = (
          <AttachmentList
            compact
            media={status.get('media_attachments')}
          />
        );
      }
      else if (status.getIn(['media_attachments', 0, 'type']) === 'video') {
        const video = status.getIn(['media_attachments', 0]);

        media = (
          <Bundle fetchComponent={Video} loading={this.renderLoadingVideoPlayer} >
            {Component => (
              <Component
                preview={video.get('preview_url')}
                blurhash={video.get('blurhash')}
                src={video.get('url')}
                alt={video.get('description')}
                width={this.props.cachedMediaWidth}
                height={110}
                inline
                sensitive={status.get('sensitive')}
                onOpenVideo={this.handleOpenVideo}
                cacheWidth={this.props.cacheMediaWidth}
                visible={this.state.showMedia}
                onToggleVisibility={this.handleToggleMediaVisibility}
              />
            )}
          </Bundle>
        );
      }
      else {
        media = (
          <Bundle fetchComponent={MediaGallery} loading={this.renderLoadingMediaGallery}>
            {Component => (
              <Component
                media={status.get('media_attachments')}
                sensitive={status.get('sensitive')}
                height={110}
                onOpenMedia={this.props.onOpenMedia}
                cacheWidth={this.props.cacheMediaWidth}
                defaultWidth={this.props.cachedMediaWidth}
                visible={this.state.showMedia}
                onToggleVisibility={this.handleToggleMediaVisibility}
              />
            )}
          </Bundle>
        );
      }
    }
    else if (status.get('spoiler_text').length === 0 && status.get('card')) {
      media = (
        <Card
          onOpenMedia={this.props.onOpenMedia}
          card={status.get('card')}
          compact
          cacheWidth={this.props.cacheMediaWidth}
          defaultWidth={this.props.cachedMediaWidth}
        />
      );
    }

    const statusUrl = `/${status.getIn(['account', 'acct'])}/posts/${status.get('id')}`;

    const containerClasses = classNames(
      'status__wrapper',
      'status__wrapper--quote',
      `status__wrapper-${status.get('visibility')}`,
      {
        'status__wrapper-reply': !!status.get('in_reply_to_id'),
        read: unread === false,
        focusable: !this.props.muted
      }
    );

    const statusClasses = classNames(
      'status',
      'status--quote',
      `status-${status.get('visibility')}`,
      {
        'status-reply': !!status.get('in_reply_to_id'),
        muted: this.props.muted,
        read: unread === false
      }
    );

    return (
      <div className={containerClasses} tabIndex={this.props.muted ? null : 0} data-featured={featured ? 'true' : null} aria-label={textForScreenReader(intl, status)} ref={this.handleRef}>
        <div className={statusClasses} data-id={status.get('id')}>
          <div className='status__info'>
            <NavLink to={statusUrl} className='status__relative-time'>
              <RelativeTimestamp timestamp={status.get('created_at')} />
            </NavLink>

            <NavLink to={`/${status.getIn(['account', 'acct'])}`} title={status.getIn(['account', 'acct'])} className='status__display-name'>
              <DisplayName account={status.get('account')} others={otherAccounts} />
            </NavLink>
          </div>

          <StatusContent
            status={status}
            onClick={this.handleClick}
            expanded={!status.get('hidden')}
            onExpandedToggle={this.handleExpandedToggle}
          />

          {media}

          {showThread && status.get('in_reply_to_id') && status.get('in_reply_to_account_id') === status.getIn(['account', 'id']) && (
            <button className='status__content__read-more-button' onClick={this.handleClick}>
              <FormattedMessage id='status.show_thread' defaultMessage='Show thread' />
            </button>
          )}
        </div>
      </div>
    );
  }

}
