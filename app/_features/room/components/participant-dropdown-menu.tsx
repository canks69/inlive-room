'use client';

import { useCallback, type Key } from 'react';
import * as Sentry from '@sentry/nextjs';
import { clientSDK } from '@/_shared/utils/sdk';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { useClientContext } from '@/_features/room/contexts/client-context';
import { type ParticipantVideo } from '@/_features/room/components/conference';
import { useMetadataContext } from '@/_features/room/contexts/metadata-context';
import { useDataChannelContext } from '@/_features/room/contexts/datachannel-context';
import CheckIcon from '@/_shared/components/icons/check-icon';

export default function ParticipantDropdownMenu({
  stream,
  children,
}: {
  stream: ParticipantVideo;
  children: React.ReactNode;
}) {
  const { roomID } = useClientContext();
  const { pinnedStreams, isModerator } = useMetadataContext();
  const { datachannels } = useDataChannelContext();

  const onMoreSelection = useCallback(
    async (key: Key) => {
      if (key === 'pin') {
        document.dispatchEvent(
          new CustomEvent('set:pin', {
            detail: {
              active: !stream.pin,
              id: stream.id,
            },
          })
        );
      } else if (key === 'pin-all') {
        try {
          if (stream.pin) {
            const newPinnedStreams = pinnedStreams.filter(
              (pinned) => pinned !== stream.id
            );

            await clientSDK.setMetadata(roomID, {
              pinnedStreams: [...newPinnedStreams],
            });
          } else {
            await clientSDK.setMetadata(roomID, {
              pinnedStreams: [...pinnedStreams, stream.id],
            });
          }
        } catch (error) {
          Sentry.captureException(error, {
            extra: {
              message: `API call error when trying to set metadata spotlight`,
            },
          });
          console.error(error);
        }
      } else if (key === 'fullscreen-view') {
        document.dispatchEvent(
          new CustomEvent('set:fullscreen', {
            detail: {
              active: !stream.fullscreen,
              id: stream.id,
            },
          })
        );
      } else if (key === 'remove-client') {
        if (!isModerator) return;

        const moderatorDataChannel = datachannels.get('moderator');

        const confirmed = confirm(
          'Are you sure you want to remove this participant?'
        );

        if (confirmed && moderatorDataChannel) {
          const message = {
            type: 'remove-client',
            data: {
              clientIDs: [stream.clientId],
            },
          };

          moderatorDataChannel.send(JSON.stringify(message));
        }
      }
    },
    [roomID, stream, isModerator, pinnedStreams, datachannels]
  );

  return (
    <Dropdown placement="bottom" className="ring-1 ring-zinc-800/70">
      <DropdownTrigger>{children}</DropdownTrigger>
      <DropdownMenu aria-label="More options" onAction={onMoreSelection}>
        {[
          <DropdownItem key="pin">
            <div className="flex items-center gap-1">
              <span>Pin for myself</span>
              {stream.pin ? (
                <span>
                  <CheckIcon width={16} height={16} />
                </span>
              ) : null}
            </div>
          </DropdownItem>,
          // @ts-ignore
          isModerator
            ? [
                <DropdownItem key="pin-all">
                  <div className="flex items-center gap-1">
                    <span>Pin for everyone</span>
                    {stream.pin ? (
                      <span>
                        <CheckIcon width={16} height={16} />
                      </span>
                    ) : null}
                  </div>
                </DropdownItem>,
              ]
            : undefined,
          // @ts-ignore
          document.fullscreenEnabled ||
          // @ts-ignore
          document.webkitFullscreenEnabled
            ? [
                <DropdownItem key="fullscreen-view">
                  <div className="flex items-center gap-1">
                    <span>Fullscreen view</span>
                    {stream.fullscreen ? (
                      <span>
                        <CheckIcon width={16} height={16} />
                      </span>
                    ) : null}
                  </div>
                </DropdownItem>,
              ]
            : undefined,
          // @ts-ignore
          isModerator && stream.origin === 'remote' && stream.source === 'media'
            ? [
                <DropdownItem key="remove-client">
                  Remove this participant
                </DropdownItem>,
              ]
            : undefined,
        ]}
      </DropdownMenu>
    </Dropdown>
  );
}
