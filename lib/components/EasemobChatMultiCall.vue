<template>
  <div>
    <!-- 大窗口模式 -->
    <div 
      v-if="!isMinimized"
      ref="containerRef" 
      class="easemob-chat-multi-call"
      :style="backgroundStyle"
      @click="handleClearScreen"
    >
    <!-- Header 区域 -->
    <div v-if="!isClearScreen" class="call-header">
      <div class="header-content">
        <img v-if="groupAvatar" :src="groupAvatar" class="group-avatar" />
        <div class="header-info">
          <h3>{{ groupName || groupId }}</h3>
          <span class="call-duration">{{ callDuration }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button @click.stop="toggleFullscreen" class="icon-btn">
          <svg v-if="!isFullscreen" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M3 4.75C3 3.7835 3.7835 3 4.75 3L8.24978 3.00369C8.664 3.00369 8.99978 3.33948 8.99978 3.75369C8.99978 4.1679 8.664 4.50369 8.24978 4.50369L4.75 4.5C4.61193 4.5 4.5 4.61193 4.5 4.75V8.25C4.5 8.66421 4.16421 9 3.75 9C3.33579 9 3 8.66421 3 8.25V4.75Z" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M19.25 3C20.2165 3 21 3.7835 21 4.75L20.9963 8.24978C20.9963 8.664 20.6605 8.99978 20.2463 8.99978C19.8321 8.99978 19.4963 8.664 19.4963 8.24978L19.5 4.75C19.5 4.61193 19.3881 4.5 19.25 4.5H15.75C15.3358 4.5 15 4.16421 15 3.75C15 3.33579 15.3358 3 15.75 3L19.25 3Z" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M4.75 21C3.7835 21 3 20.2165 3 19.25L3.00369 15.7502C3.00369 15.336 3.33948 15.0002 3.75369 15.0002C4.1679 15.0002 4.50369 15.336 4.50369 15.7502L4.5 19.25C4.5 19.3881 4.61193 19.5 4.75 19.5H8.25C8.66421 19.5 9 19.8358 9 20.25C9 20.6642 8.66421 21 8.25 21H4.75Z" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M21 19.25C21 20.2165 20.2165 21 19.25 21L15.7502 20.9963C15.336 20.9963 15.0002 20.6605 15.0002 20.2463C15.0002 19.8321 15.336 19.4963 15.7502 19.4963L19.25 19.5C19.3881 19.5 19.5 19.3881 19.5 19.25V15.75C19.5 15.3358 19.8358 15 20.25 15C20.6642 15 21 15.3358 21 15.75V19.25Z" />
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M9 7.25C9 8.2165 8.2165 9 7.25 9L3.75022 8.99631C3.336 8.99631 3.00022 8.66052 3.00022 8.24631C3.00022 7.8321 3.336 7.49631 3.75022 7.49631L7.25 7.5C7.38807 7.5 7.5 7.38807 7.5 7.25L7.5 3.75C7.5 3.33579 7.83579 3 8.25 3C8.66421 3 9 3.33579 9 3.75L9 7.25Z" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M16.75 9C15.7835 9 15 8.2165 15 7.25L15.0037 3.75022C15.0037 3.336 15.3395 3.00022 15.7537 3.00022C16.1679 3.00022 16.5037 3.336 16.5037 3.75022L16.5 7.25C16.5 7.38807 16.6119 7.5 16.75 7.5L20.25 7.5C20.6642 7.5 21 7.83579 21 8.25C21 8.66421 20.6642 9 20.25 9L16.75 9Z" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.25 15C8.2165 15 9 15.7835 9 16.75L8.99631 20.2498C8.99631 20.664 8.66052 20.9998 8.24631 20.9998C7.8321 20.9998 7.49631 20.664 7.49631 20.2498L7.5 16.75C7.5 16.6119 7.38807 16.5 7.25 16.5L3.75 16.5C3.33579 16.5 3 16.1642 3 15.75C3 15.3358 3.33579 15 3.75 15L7.25 15Z" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M15 16.75C15 15.7835 15.7835 15 16.75 15L20.2498 15.0037C20.664 15.0037 20.9998 15.3395 20.9998 15.7537C20.9998 16.1679 20.664 16.5037 20.2498 16.5037L16.75 16.5C16.6119 16.5 16.5 16.6119 16.5 16.75V20.25C16.5 20.6642 16.1642 21 15.75 21C15.3358 21 15 20.6642 15 20.25V16.75Z" />
          </svg>
          <span>{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
        </button>
        <button @click.stop="handleAddParticipant" class="icon-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M18.22 10.22C18.22 10.6508 18.5692 11 19 11C19.4308 11 19.78 10.6508 19.78 10.22L19.78 8.78003L21.22 8.78002C21.6508 8.78002 22 8.43079 22 7.99999C22 7.5692 21.6508 7.21997 21.22 7.21997L19.78 7.21998L19.78 5.78002C19.78 5.34923 19.4308 5 19 5C18.5692 5 18.22 5.34923 18.22 5.78002L18.22 7.21999L16.78 7.22C16.3492 7.22 16 7.56922 16 8.00002C16 8.43081 16.3492 8.78004 16.78 8.78004L18.22 8.78003L18.22 10.22Z" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12.4818 12.5687C12.5541 12.5288 12.6256 12.4862 12.6962 12.4409C13.2768 12.0681 13.7319 11.5683 14.0615 10.9414C14.4067 10.3145 14.5793 9.63672 14.5793 8.90816V7.09184C14.5793 6.34633 14.4067 5.66012 14.0615 5.03321C13.7319 4.40631 13.2768 3.91495 12.6962 3.55913C12.1156 3.18638 11.4801 3 10.7896 3C10.0992 3 9.46366 3.18638 8.88305 3.55913C8.30245 3.91495 7.83953 4.40631 7.4943 5.03321C7.16477 5.66012 7 6.34633 7 7.09184V8.90816C7 9.63672 7.16477 10.3145 7.4943 10.9414C7.83953 11.5683 8.30245 12.0681 8.88305 12.4409C8.97661 12.5009 9.0716 12.5562 9.16802 12.6065C9.66991 12.8688 10.2105 13 10.7896 13C10.8603 13 10.9305 12.998 11 12.9941C11.527 12.9645 12.0209 12.8227 12.4818 12.5687ZM12.744 14.1072C12.1884 14.0357 11.6071 14 11 14C10.9295 14 10.8594 14.0005 10.7896 14.0014C10.1446 14.0103 9.52913 14.0604 8.94335 14.1516C8.30561 14.2509 7.70303 14.3989 7.13559 14.5957C6.17137 14.9267 5.33522 15.3901 4.62712 15.9858C4.03955 16.4657 3.58757 16.987 3.27119 17.5496C3.0904 17.8972 3 18.3522 3 18.9149C3 19.4775 3.18079 19.9657 3.54237 20.3794C3.91902 20.7931 4.371 21 4.89831 21H17.1017C17.629 21 18.0734 20.7931 18.435 20.3794C18.8117 19.9657 19 19.4775 19 18.9149C19 18.3522 18.9096 17.8972 18.7288 17.5496C18.4124 16.987 17.9605 16.4657 17.3729 15.9858C16.6648 15.3901 15.8286 14.9267 14.8644 14.5957C14.2051 14.367 13.4983 14.2042 12.744 14.1072ZM17.4053 18.2566C17.1952 17.8922 16.8797 17.5197 16.424 17.1476L16.4156 17.1407L16.4072 17.1336C15.8543 16.6685 15.1845 16.2915 14.3774 16.0145L14.3728 16.0129C13.4116 15.6795 12.2935 15.5 11 15.5C9.70653 15.5 8.5884 15.6795 7.62716 16.0129L7.62258 16.0145L7.62258 16.0145C6.81549 16.2915 6.1457 16.6685 5.5928 17.1336L5.58444 17.1407L5.57599 17.1476C5.12032 17.5197 4.8048 17.8922 4.59471 18.2567C4.56071 18.3309 4.5 18.5244 4.5 18.9149C4.5 19.1181 4.55224 19.2513 4.66199 19.3809C4.76716 19.493 4.82385 19.5 4.89831 19.5H17.1017C17.1635 19.5 17.1883 19.4893 17.1976 19.4849C17.2084 19.4799 17.2458 19.4607 17.3056 19.3923L17.3156 19.3809L17.3258 19.3696C17.4495 19.2338 17.5 19.1064 17.5 18.9149C17.5 18.5244 17.4393 18.3308 17.4053 18.2566ZM8.81534 10.2306C9.04375 10.6409 9.3346 10.9482 9.69343 11.1786L8.88305 12.4409L9.69343 11.1786C10.0321 11.396 10.3863 11.5 10.7896 11.5C11.193 11.5 11.5472 11.396 11.8859 11.1786C12.2421 10.9499 12.5216 10.647 12.7337 10.2434L12.7405 10.2306L12.7475 10.2178C12.9684 9.81667 13.0793 9.38847 13.0793 8.90816V7.09184C13.0793 6.5884 12.9655 6.15265 12.7475 5.75678L12.7405 5.74403L12.7337 5.73114C12.5246 5.33334 12.2533 5.04694 11.9125 4.83808L11.8991 4.82987L11.8859 4.82139C11.5472 4.60397 11.193 4.5 10.7896 4.5C10.3863 4.5 10.0321 4.60397 9.69343 4.82139L9.68022 4.82987L9.66683 4.83808C9.32322 5.04865 9.04053 5.33964 8.81535 5.74396C8.60927 6.14091 8.5 6.58179 8.5 7.09184V8.90816C8.5 9.39561 8.60669 9.82887 8.81534 10.2306Z" />
          </svg>
          <span>添加成员</span>
        </button>
      </div>
    </div>

    <!-- 视频内容区域 -->
    <div class="video-content" ref="contentRef">
      <div v-if="participants.length === 0" class="empty-state">
        暂无参与者
      </div>
      
      <!-- 网格布局模式 -->
      <div 
        v-else-if="!isMainVideoMode" 
        class="video-grid"
        :class="`video-grid-rows-${layoutConfig.rows}`"
      >
        <div 
          v-for="(row, rowIndex) in layoutRows" 
          :key="rowIndex"
          class="video-row"
        >
          <div
            v-for="participant in row"
            :key="participant.userId"
            class="video-wrapper"
            :style="videoWrapperStyle"
            @click.stop="handleVideoClick(participant.userId)"
          >
            <div class="participant-video">
              <video
                ref="videoRefs"
                :data-user-id="participant.userId"
                autoplay
                playsinline
                :muted="participant.userId === currentUserId"
              ></video>
              <div class="participant-info">
                <span>{{ participant.userName }}</span>
                <span v-if="participant.isMuted" class="muted-indicator">🔇</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主视频模式（一大多小） -->
      <div v-else class="main-video-layout">
        <!-- 主视频 -->
        <div class="main-video" :style="mainVideoStyle" @click.stop="exitMainVideoMode">
          <div class="participant-video">
            <video
              :data-user-id="selectedParticipant?.userId"
              autoplay
              playsinline
              :muted="selectedParticipant?.userId === currentUserId"
            ></video>
            <div class="participant-info">
              <span>{{ selectedParticipant?.userName }}</span>
              <span v-if="selectedParticipant?.isMuted" class="muted-indicator">🔇</span>
            </div>
          </div>
        </div>

        <!-- 缩略图列表 -->
        <div v-if="otherParticipants.length > 0" class="thumbnails-container">
          <!-- 左滚动按钮 -->
          <button 
            v-if="canScrollLeft" 
            class="scroll-button scroll-left"
            @click.stop="scrollThumbnails('left')"
          >
            ‹
          </button>

          <!-- 缩略图滚动区域 -->
          <div class="thumbnails-scroll" ref="thumbnailScrollRef">
            <div class="thumbnails-list" :style="thumbnailsListStyle">
              <div
                v-for="participant in otherParticipants"
                :key="participant.userId"
                class="thumbnail-wrapper"
                @click.stop="handleVideoClick(participant.userId)"
              >
                <div class="participant-video">
                  <video
                    :data-user-id="participant.userId"
                    autoplay
                    playsinline
                    :muted="participant.userId === currentUserId"
                  ></video>
                  <div class="participant-info">
                    <span>{{ participant.userName }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右滚动按钮 -->
          <button 
            v-if="canScrollRight" 
            class="scroll-button scroll-right"
            @click.stop="scrollThumbnails('right')"
          >
            ›
          </button>
        </div>
      </div>
    </div>

    <!-- Controls 区域 -->
    <div v-if="!isClearScreen" class="call-controls">
      <button @click.stop="toggleMute" :class="{ active: isMuted }" class="control-btn">
        <svg v-if="!isMuted" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M12 4C9.51472 4 7.5 6.01472 7.5 8.5V11.5C7.5 13.9853 9.51472 16 12 16C14.4853 16 16.5 13.9853 16.5 11.5V8.5C16.5 6.01472 14.4853 4 12 4ZM12 10.0199C12.6904 10.0199 13.25 9.46025 13.25 8.7699C13.25 8.07954 12.6904 7.5199 12 7.5199C11.3096 7.5199 10.75 8.07954 10.75 8.7699C10.75 9.46025 11.3096 10.0199 12 10.0199Z" />
          <path fill-rule="evenodd" clip-rule="evenodd" d="M19.2565 11.4532C19.2565 11.0114 18.8984 10.6532 18.4565 10.6532C18.0147 10.6532 17.6565 11.0114 17.6565 11.4532C17.6565 14.4705 15.2105 16.9166 12.1931 16.9166H11.7963C8.78476 16.9166 6.34341 14.4752 6.34341 11.4637C6.34341 11.0218 5.98524 10.6637 5.54341 10.6637C5.10158 10.6637 4.74341 11.0218 4.74341 11.4637C4.74341 15.158 7.58384 18.189 11.2 18.4917V19.4503C11.2 19.8921 11.5581 20.2503 12 20.2503C12.4418 20.2503 12.8 19.8921 12.8 19.4503V18.4909C16.4169 18.1831 19.2565 15.1498 19.2565 11.4532Z" />
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3.80694 20.1909C3.51405 19.8981 3.51405 19.4232 3.80694 19.1303L19.1323 3.80906C19.4252 3.51616 19.9001 3.51616 20.1929 3.80906C20.4858 4.10195 20.4858 4.57682 20.1929 4.86972L4.8676 20.1909C4.57471 20.4838 4.09983 20.4838 3.80694 20.1909Z" />
          <path fill-rule="evenodd" clip-rule="evenodd" d="M8.48343 17.7627C9.30606 18.2658 10.2448 18.5977 11.25 18.7088V20.25C11.25 20.6642 11.5858 21 12 21C12.4142 21 12.75 20.6642 12.75 20.25V18.7088C16.125 18.3357 18.75 15.4744 18.75 12V11C18.75 10.5858 18.4142 10.25 18 10.25C17.5858 10.25 17.25 10.5858 17.25 11V12C17.25 14.8995 14.8995 17.25 12 17.25C11.1288 17.25 10.3071 17.0378 9.58393 16.6622L8.48343 17.7627ZM10.5264 15.7198C10.9824 15.9006 11.4796 16 12 16C14.2091 16 16 14.2091 16 12V10.2462L10.5264 15.7198ZM15.8484 5.90554L8.28023 13.4737C8.09939 13.0177 8 12.5204 8 12V7C8 4.79086 9.79086 3 12 3C13.8297 3 15.3724 4.22845 15.8484 5.90554ZM7.3378 14.4162L6.2373 15.5167C5.61097 14.4925 5.25 13.2884 5.25 12V11C5.25 10.5858 5.58579 10.25 6 10.25C6.41421 10.25 6.75 10.5858 6.75 11V12C6.75 12.8712 6.96223 13.6929 7.3378 14.4162Z" />
        </svg>
        <span>{{ isMuted ? '取消静音' : '静音' }}</span>
      </button>
      <button @click.stop="toggleVideo" :class="{ active: !isVideoEnabled }" class="control-btn">
        <svg v-if="isVideoEnabled" width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3.88889 5C2.84568 5 2 5.84568 2 6.88889V17.1111C2 18.1543 2.84568 19 3.88889 19H15.8611C16.9043 19 17.75 18.1543 17.75 17.1111V15.3089L21.0178 17.1244C21.4585 17.3692 22 17.0505 22 16.5464V7.46025C22 6.95616 21.4585 6.63753 21.0178 6.88233L17.75 8.69779V6.88889C17.75 5.84568 16.9043 5 15.8611 5H3.88889ZM5.5 10C6.32843 10 7 9.32843 7 8.5C7 7.67157 6.32843 7 5.5 7C4.67157 7 4 7.67157 4 8.5C4 9.32843 4.67157 10 5.5 10Z" />
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M7.24619 19H14.3611C15.4043 19 16.25 18.1543 16.25 17.1111V15.3089L19.5178 17.1244C19.9585 17.3692 20.5 17.0505 20.5 16.5464V7.46025C20.5 6.95616 19.9585 6.63753 19.5178 6.88233L19.1714 7.0748L7.24619 19ZM15.9249 5.82909C15.5851 5.32872 15.0115 5 14.3611 5H5.38889C4.34568 5 3.5 5.84568 3.5 6.88889V17.1111C3.5 17.4409 3.58453 17.751 3.73312 18.0209L15.9249 5.82909Z" />
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3.80694 20.1909C3.51405 19.8981 3.51405 19.4232 3.80694 19.1303L19.1323 3.80906C19.4252 3.51616 19.9001 3.51616 20.1929 3.80906C20.4858 4.10195 20.4858 4.57682 20.1929 4.86972L4.8676 20.1909C4.57471 20.4838 4.09983 20.4838 3.80694 20.1909Z" />
        </svg>
        <span>{{ isVideoEnabled ? '关闭摄像头' : '开启摄像头' }}</span>
      </button>
      <button @click.stop="toggleScreenShare" :class="{ active: isScreenSharing }" class="control-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M11.6258 6.96235C11.9187 6.66945 12.3936 6.66945 12.6865 6.96235L16.4867 10.7626C17.1701 11.446 17.1701 12.554 16.4867 13.2374L12.6865 17.0377C12.3936 17.3305 11.9187 17.3305 11.6258 17.0377C11.3329 16.7448 11.3329 16.2699 11.6258 15.977L14.8528 12.75L7.40979 12.75C6.99558 12.75 6.65979 12.4142 6.65979 12C6.65979 11.5858 6.99558 11.25 7.40979 11.25L14.8528 11.25L11.6258 8.02301C11.3329 7.73011 11.3329 7.25524 11.6258 6.96235Z" />
        </svg>
        <span>{{ isScreenSharing ? '停止共享' : '共享屏幕' }}</span>
      </button>
      <button @click.stop="endCall" class="control-btn end-call-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.43445 12.6265C8.40888 12.6658 8.46336 13.037 8.45381 13.1428C8.43469 13.3543 8.44114 13.5264 8.40602 13.6715C8.24328 14.7412 7.53366 15.2879 5.71437 15.4497C4.58252 15.5543 3.85663 15.3068 3.4024 14.7319C3.08891 14.3045 2.98642 13.7342 3.01174 12.967C2.99573 12.9006 2.99239 12.4507 3.02751 12.3056C3.02369 10.4 7.03906 8.58585 11.9887 8.60976C16.8967 8.60665 20.9804 10.4191 21.0002 12.3909L20.9971 12.6688L20.994 12.9466C20.9911 13.9523 20.9178 14.5203 20.5023 14.9781C20.0867 15.4359 19.3642 15.6384 18.3857 15.5067C16.2946 15.2681 15.6485 14.6246 15.6064 13.1421C15.616 13.0363 15.6286 12.6527 15.5871 12.6257C15.5742 12.2815 14.196 11.9462 12.0345 11.9979C9.81551 11.9561 8.40554 12.2159 8.43445 12.6265Z" />
        </svg>
        <span>挂断</span>
      </button>
    </div>
    
    <!-- 最小化按钮 -->
    <button v-if="!isClearScreen" class="minimize-btn" @click.stop="handleMinimize" title="最小化">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
  
  <!-- 小窗口模式 -->
  <EasemobChatMiniWindow 
    v-if="isMinimized" 
    @expand="handleExpand" 
    @close="endCall"
  />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useCallStateStore } from '../store/callState'
import { useRtcChannelStore } from '../store/rtcChannel'
import { CallService } from '../services/CallService'
import { HANGUP_REASON } from '../types/callstate.types'
import { logger } from '../utils/logger'
import EasemobChatMiniWindow from './EasemobChatMiniWindow.vue'

interface Participant {
  userId: string
  userName: string
  avatar?: string
  isHost?: boolean
  isMuted?: boolean
}

interface Props {
  groupId?: string
  groupName?: string
  groupAvatar?: string
  participants: Participant[]
  type: 'audio' | 'video'
  maxParticipants?: number
  backgroundImage?: string
  currentUserId?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxParticipants: 18,
  type: 'video'
})

const emit = defineEmits<{
  callStarted: []
  callEnded: []
  addParticipant: []
}>()

const callStateStore = useCallStateStore()
const rtcChannelStore = useRtcChannelStore()

// Refs
const containerRef = ref<HTMLDivElement>()
const contentRef = ref<HTMLDivElement>()
const thumbnailScrollRef = ref<HTMLDivElement>()
const videoRefs = ref<HTMLVideoElement[]>([])

// 状态
const isMuted = ref(false)
const isVideoEnabled = ref(true)
const isScreenSharing = ref(false)
const isCallActive = ref(false)
const isClearScreen = ref(false)
const isFullscreen = ref(false)

// 布局模式
const isMainVideoMode = ref(false)
const selectedVideoId = ref<string | null>(null)

// 滚动状态
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

// 容器尺寸
const containerSize = ref({ width: 0, height: 0 })

// 通话时长（从 store 获取格式化后的字符串）
const callDuration = computed(() => rtcChannelStore.formattedCallDuration)

// 小窗口模式状态
const isMinimized = computed(() => callStateStore.isMinimized)

// 最小化窗口
const handleMinimize = () => {
  callStateStore.isMinimized = true
}

// 展开窗口
const handleExpand = () => {
  callStateStore.isMinimized = false
}

// 计算属性
const backgroundStyle = computed(() => {
  if (props.backgroundImage) {
    return {
      backgroundImage: `url(${props.backgroundImage})`,
      backgroundSize: '100% 100%',
      backgroundPosition: '0px 0px',
      backgroundRepeat: 'no-repeat'
    }
  }
  // 使用默认背景图
  return {
    backgroundImage: 'url(/lib/callkit-static-assets/images/callkit_bg.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  }
})

// 布局配置
interface LayoutConfig {
  rows: number
  cols: number
  maxCols: number
  itemsPerRow: number[]
}

const layoutConfig = computed((): LayoutConfig => {
  const count = props.participants.length
  const isMobile = containerSize.value.width < 530

  if (count === 0) {
    return { rows: 0, cols: 0, maxCols: 0, itemsPerRow: [] }
  }

  if (isMobile) {
    // 移动端布局
    if (count <= 2) {
      return { rows: 1, cols: count, maxCols: count, itemsPerRow: [count] }
    } else if (count <= 4) {
      return { rows: 2, cols: 2, maxCols: 2, itemsPerRow: [2, count - 2] }
    } else if (count <= 6) {
      return { rows: 3, cols: 2, maxCols: 2, itemsPerRow: [2, 2, count - 4] }
    } else if (count <= 9) {
      return { rows: 3, cols: 3, maxCols: 3, itemsPerRow: [3, 3, count - 6] }
    } else if (count <= 12) {
      return { rows: 4, cols: 3, maxCols: 3, itemsPerRow: [3, 3, 3, count - 9] }
    } else {
      return { rows: 4, cols: 4, maxCols: 4, itemsPerRow: [4, 4, 4, count - 12] }
    }
  } else {
    // 桌面端布局
    if (count <= 4) {
      return { rows: 1, cols: count, maxCols: count, itemsPerRow: [count] }
    } else if (count <= 8) {
      const firstRow = 4
      return { rows: 2, cols: 4, maxCols: 4, itemsPerRow: [firstRow, count - firstRow] }
    } else if (count <= 10) {
      const firstRow = 5
      return { rows: 2, cols: 5, maxCols: 5, itemsPerRow: [firstRow, count - firstRow] }
    } else if (count <= 12) {
      const firstRow = 6
      return { rows: 2, cols: 6, maxCols: 6, itemsPerRow: [firstRow, count - firstRow] }
    } else {
      const firstRow = 6
      const secondRow = 6
      return { 
        rows: 3, 
        cols: 6, 
        maxCols: 6, 
        itemsPerRow: [firstRow, secondRow, count - firstRow - secondRow] 
      }
    }
  }
})

// 按行分组参与者
const layoutRows = computed(() => {
  const rows: Participant[][] = []
  let participantIndex = 0

  layoutConfig.value.itemsPerRow.forEach(itemCount => {
    const row = props.participants.slice(participantIndex, participantIndex + itemCount)
    rows.push(row)
    participantIndex += itemCount
  })

  return rows
})

// 视频窗口样式
const videoWrapperStyle = computed(() => {
  const { rows, maxCols } = layoutConfig.value
  const gap = 8
  const headerHeight = isClearScreen.value ? 0 : 60
  const controlsHeight = isClearScreen.value ? 0 : 60
  const containerPadding = 8
  
  const availableHeight = containerSize.value.height - headerHeight - controlsHeight - containerPadding * 2 - 16 - 8
  const availableWidth = containerSize.value.width - containerPadding * 2 - gap * 2

  const totalRowGaps = Math.max(0, rows - 1) * gap
  const videoContainerHeight = availableHeight - totalRowGaps
  const heightPerRow = videoContainerHeight / rows

  const totalWidthGaps = (maxCols - 1) * gap
  const widthBasedVideoWidth = (availableWidth - totalWidthGaps) / maxCols
  const widthBasedVideoHeight = widthBasedVideoWidth / 1 // aspectRatio = 1

  const heightBasedVideoHeight = heightPerRow
  const heightBasedVideoWidth = heightBasedVideoHeight * 1

  let finalVideoWidth: number
  let finalVideoHeight: number

  if (widthBasedVideoHeight <= heightPerRow) {
    finalVideoWidth = widthBasedVideoWidth
    finalVideoHeight = widthBasedVideoHeight
  } else {
    finalVideoWidth = heightBasedVideoWidth
    finalVideoHeight = heightBasedVideoHeight
  }

  finalVideoWidth = Math.max(100, finalVideoWidth)
  finalVideoHeight = Math.max(100, finalVideoHeight)

  return {
    width: `${finalVideoWidth}px`,
    height: `${finalVideoHeight}px`,
    flexShrink: 0,
    flexGrow: 0
  }
})

// 主视频模式相关
const selectedParticipant = computed(() => {
  if (!selectedVideoId.value) return props.participants[0]
  return props.participants.find(p => p.userId === selectedVideoId.value) || props.participants[0]
})

const otherParticipants = computed(() => {
  return props.participants.filter(p => p.userId !== selectedParticipant.value?.userId)
})

const mainVideoStyle = computed(() => {
  const gap = 12
  const containerPadding = 16
  const thumbnailHeight = 72
  const headerHeight = isClearScreen.value ? 0 : 60
  const controlsHeight = isClearScreen.value ? 0 : 60
  
  const totalFixedHeight = headerHeight + controlsHeight + 16 + 8
  const availableHeight = containerSize.value.height - totalFixedHeight - 14
  const availableWidth = containerSize.value.width - containerPadding * 2

  const mainVideoMaxHeight = availableHeight - thumbnailHeight - gap - containerPadding * 2
  const mainVideoMaxWidth = availableWidth

  let videoWidth = mainVideoMaxWidth
  let videoHeight = videoWidth / 1

  if (videoHeight > mainVideoMaxHeight) {
    videoHeight = mainVideoMaxHeight
    videoWidth = mainVideoMaxHeight * 1
  }

  videoWidth = Math.max(100, videoWidth)
  videoHeight = Math.max(100, videoHeight)

  if (videoWidth > videoHeight) {
    videoWidth = videoHeight * 1
  } else {
    videoHeight = videoWidth / 1
  }

  return {
    width: `${videoWidth}px`,
    height: `${videoHeight}px`
  }
})

const thumbnailsListStyle = computed(() => {
  const thumbnailWidth = 72
  const gap = 8
  const totalWidth = otherParticipants.value.length * (thumbnailWidth + gap) - gap
  return {
    display: 'flex',
    gap: `${gap}px`,
    width: `${totalWidth}px`,
    minWidth: 'max-content',
    height: '100%'
  }
})

// 方法
const startCall = async () => {
  try {
    isCallActive.value = true
    emit('callStarted')
    
    // 开始计时
    rtcChannelStore.startCallTimer()
    
    console.log(`Starting ${props.type} group call in ${props.groupId || props.groupName}`)
  } catch (error) {
    console.error('Failed to start group call:', error)
  }
}

const toggleMute = () => {
  isMuted.value = !isMuted.value
  // TODO: 实现静音逻辑
}

const toggleVideo = () => {
  isVideoEnabled.value = !isVideoEnabled.value
  // TODO: 实现视频开关逻辑
}

const toggleScreenShare = () => {
  isScreenSharing.value = !isScreenSharing.value
  // TODO: 实现屏幕共享逻辑
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  // TODO: 实现全屏逻辑
}

const endCall = async () => {
  try {
    logger.info('EasemobChatMultiCall: 用户点击挂断按钮，开始挂断流程')
    
    // 调用 CallService 发送 leaveCall 信令并清理资源
    const callService = new CallService()
    await callService.hangup(HANGUP_REASON.HANGUP)
    
    logger.info('EasemobChatMultiCall: 挂断流程完成')
  } catch (error) {
    logger.error('EasemobChatMultiCall: 挂断失败:', error)
  } finally {
    // 无论信令发送成功与否，都要清理本地状态
    isCallActive.value = false
    emit('callEnded')
  }
}

const handleAddParticipant = () => {
  emit('addParticipant')
}

// 清屏模式切换
const handleClearScreen = () => {
  isClearScreen.value = !isClearScreen.value
}

// 视频点击处理
const handleVideoClick = (userId: string) => {
  if (!isMainVideoMode.value) {
    // 首次进入主视频模式
    isMainVideoMode.value = true
    selectedVideoId.value = userId
  } else if (selectedVideoId.value !== userId) {
    // 切换主视频
    selectedVideoId.value = userId
  }
}

// 退出主视频模式
const exitMainVideoMode = () => {
  isMainVideoMode.value = false
  selectedVideoId.value = null
}

// 缩略图滚动
const checkScrollState = () => {
  const container = thumbnailScrollRef.value
  if (!container) return

  const { scrollLeft, scrollWidth, clientWidth } = container
  canScrollLeft.value = scrollLeft > 0
  canScrollRight.value = scrollLeft < scrollWidth - clientWidth - 5
}

const scrollThumbnails = (direction: 'left' | 'right') => {
  const container = thumbnailScrollRef.value
  if (!container) return

  const thumbnailWidth = 72
  const gap = 8
  const scrollAmount = (thumbnailWidth + gap) * 2
  const currentScrollLeft = container.scrollLeft
  const targetScrollLeft = direction === 'left'
    ? currentScrollLeft - scrollAmount
    : currentScrollLeft + scrollAmount

  container.scrollTo({
    left: targetScrollLeft,
    behavior: 'smooth'
  })
}

// 更新容器尺寸
const updateContainerSize = () => {
  if (contentRef.value) {
    containerSize.value = {
      width: contentRef.value.clientWidth,
      height: contentRef.value.clientHeight
    }
  }
}

// 监听缩略图滚动
watch(() => thumbnailScrollRef.value, () => {
  const container = thumbnailScrollRef.value
  if (!container) return

  container.addEventListener('scroll', checkScrollState)
  setTimeout(checkScrollState, 200)
}, { immediate: true })

watch(() => otherParticipants.value.length, () => {
  setTimeout(checkScrollState, 300)
})

onMounted(() => {
  startCall()
  updateContainerSize()
  
  // 监听窗口大小变化
  window.addEventListener('resize', updateContainerSize)
  
  // 初始化后延迟计算容器尺寸
  nextTick(() => {
    updateContainerSize()
  })
})

onUnmounted(() => {
  endCall()
  window.removeEventListener('resize', updateContainerSize)
  
  const container = thumbnailScrollRef.value
  if (container) {
    container.removeEventListener('scroll', checkScrollState)
  }
})
</script>

<style scoped>
.easemob-chat-multi-call {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

/* Header 样式 */
.call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 16px;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
}

.header-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.call-duration {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 视频内容区域 */
.video-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 8px;
}

.empty-state {
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
}

/* 网格布局 */
.video-grid {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.video-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.video-wrapper {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.video-wrapper:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.participant-video {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.participant-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.participant-info {
  position: absolute;
  bottom: 8px;
  left: 8px;
  color: white;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.muted-indicator {
  font-size: 12px;
}

/* 主视频布局 */
.main-video-layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.main-video {
  cursor: pointer;
  transition: transform 0.2s;
}

.main-video:hover {
  transform: scale(1.01);
}

/* 缩略图容器 */
.thumbnails-container {
  position: relative;
  width: 100%;
  max-width: 600px;
  height: 72px;
  display: flex;
  align-items: center;
}

.thumbnails-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.thumbnails-scroll::-webkit-scrollbar {
  display: none;
}

.thumbnails-list {
  display: flex;
  height: 100%;
}

.thumbnail-wrapper {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s;
}

.thumbnail-wrapper:hover {
  transform: scale(1.05);
}

.thumbnail-wrapper .participant-video {
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.thumbnail-wrapper .participant-info {
  font-size: 10px;
  padding: 2px 4px;
}

/* 滚动按钮 */
.scroll-button {
  position: absolute;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s;
}

.scroll-button:hover {
  background: rgba(0, 0, 0, 0.9);
}

.scroll-left {
  left: -16px;
}

.scroll-right {
  right: -16px;
}

/* 控制按钮 */
.call-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  height: 60px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.control-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 50px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.control-btn.active {
  background: #ff4757;
}

.end-call-btn {
  background: #ff4757;
}

.end-call-btn:hover {
  background: #ff3838;
}

.minimize-btn {
  position: absolute;
  top: 16px;
  right: 80px;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
  z-index: 1010;
}

.minimize-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.minimize-btn svg {
  width: 24px;
  height: 24px;
}

/* 响应式 */
@media (max-width: 768px) {
  .call-header {
    padding: 0 12px;
  }
  
  .header-info h3 {
    font-size: 14px;
  }
  
  .call-duration {
    font-size: 12px;
  }
  
  .icon-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .control-btn {
    padding: 8px 16px;
    font-size: 12px;
  }
  
  .thumbnails-container {
    max-width: 100%;
  }
}
</style>