'use client';

import { useCallback, Key } from 'react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  ButtonGroup,
  Button,
} from '@heroui/react';
import HangUpIcon from '@/_shared/components/icons/hang-up-icon';
import { useClientContext } from '@/_features/room/contexts/client-context';
import { useDataChannelContext } from '@/_features/room/contexts/datachannel-context';
import { useMetadataContext } from '@/_features/room/contexts/metadata-context';
import ArrowDownFillIcon from '@/_shared/components/icons/arrow-down-fill-icon';
import { ParticipantVideo } from './conference';

export default function ButtonLeave({
  streams,
}: {
  streams: ParticipantVideo[];
}) {
  const { clientID, roomID } = useClientContext();
  const { datachannels } = useDataChannelContext();
  const { isModerator, roomType } = useMetadataContext();

  const handleLeaveRoom = () => {
    document.dispatchEvent(
      new CustomEvent('trigger:client-leave', {
        detail: {
          clientID: clientID,
          roomType: roomType,
        },
      })
    );
  };

  const onLeaveSelection = useCallback(
    (key: Key) => {
      if (key === 'leave') {
        document.dispatchEvent(
          new CustomEvent('trigger:client-leave', {
            detail: {
              clientID: clientID,
              roomType: roomType,
            },
          })
        );
      } else if (key === 'end') {
        if (!isModerator) return;

        const moderatorDataChannel = datachannels.get('moderator');

        const confirmed = confirm(
          'Are you sure you want to end the room for everyone?'
        );

        if (confirmed && moderatorDataChannel) {
          const removeDuplicateclientIDs = new Set(
            streams.map((stream) => stream.clientId)
          );

          const clientIDs = Array.from(removeDuplicateclientIDs);

          const message = {
            type: 'remove-client',
            data: {
              clientIDs: clientIDs,
            },
          };

          moderatorDataChannel.send(JSON.stringify(message));

          document.dispatchEvent(
            new CustomEvent('trigger:client-leave', {
              detail: {
                clientID: clientID,
                roomType: roomType,
              },
            })
          );

          if (roomType === 'event') {
            navigator.sendBeacon(`/api/rooms/${roomID}/end`);
          }
        }
      }
    },
    [clientID, datachannels, isModerator, roomID, roomType, streams]
  );

  return (
    <ButtonGroup variant="flat">
      <Button
        isIconOnly
        variant="flat"
        aria-label="Leave from this room"
        className="bg-red-600/70 hover:bg-red-600 focus:outline-zinc-100 active:bg-red-500"
        onPress={handleLeaveRoom}
      >
        <HangUpIcon width={20} height={20} />
      </Button>
      {isModerator && (
        <Dropdown placement="bottom" className=" ring-1 ring-zinc-800/70">
          <DropdownTrigger>
            <Button
              isIconOnly
              className="w-8 min-w-0 bg-red-600/70 hover:bg-red-600 active:bg-red-500"
            >
              <ArrowDownFillIcon className="h-3.5 w-3.5" />
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Leave room options"
            onAction={onLeaveSelection}
          >
            <DropdownItem
              key="leave"
              description="Others still stay in the room. You can rejoin later."
            >
              Leave room
            </DropdownItem>
            <DropdownItem
              key="end"
              description="This will make everyone leave the room."
            >
              End room for everyone
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      )}
    </ButtonGroup>
  );
}
