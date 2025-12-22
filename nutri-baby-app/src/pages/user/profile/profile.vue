<template>
  <view class="profile-container">
    <wd-navbar
      title="个人资料"
      left-text="返回"
      left-arrow
      fixed
      placeholder
      safe-area-inset-top
      @click-left="goBack"
    />

    <scroll-view class="profile-scroll" scroll-y>
      <view class="profile-content">
        <!-- 头像大卡片 (Premium Style) -->
        <view class="avatar-hero-card premium-shadow">
          <button
            class="avatar-trigger"
            open-type="chooseAvatar"
            @chooseavatar="onChooseAvatar"
          >
            <image
              :src="formData.avatarUrl || '/static/default.png'"
              mode="aspectFill"
              class="avatar-img"
            />
            <view class="camera-fab">
              <wd-icon name="camera" size="18" color="#FFF" />
            </view>
          </button>
          <text class="upload-hint">点击同步微信头像</text>
        </view>

        <!-- 表单卡片 -->
        <view class="form-card premium-shadow">
          <view class="form-item-premium">
            <view class="l">
              <text class="label">我的昵称</text>
              <input
                v-model="formData.nickName"
                type="nickname"
                class="nickname-input"
                placeholder="点击设置昵称"
                @blur="onNicknameBlur"
              />
            </view>
            <wd-icon name="edit-1" size="16" color="#94A3B8" />
          </view>

          <view class="form-divider"></view>

          <view class="form-item-premium readonly">
            <view class="l">
              <text class="label">账户 ID</text>
              <text class="val-txt">{{
                formData.openid ? formData.openid.slice(0, 16) + "..." : "-"
              }}</text>
            </view>
            <wd-icon
              name="copy"
              size="16"
              color="#CBD5E1"
              @click="handleCopyId"
            />
          </view>
        </view>

        <view class="info-guide">
          <wd-icon name="info-circle" size="14" />
          <text>完善个人资料，让协作成员更清晰地识别您</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="safe-bottom-dock">
      <wd-button
        block
        round
        type="primary"
        size="large"
        :loading="isSubmitting"
        @click="handleSubmit"
      >
        确认并保存
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getUserInfo, setUserInfo } from "@/store/user";
import { uploadFile } from "@/utils/request";
import * as authApi from "@/api/auth";
import { goBack } from "@/utils/common";

const formData = ref({
  openid: "",
  nickName: "",
  avatarUrl: "",
});

const isSubmitting = ref(false);

onMounted(() => {
  const user = getUserInfo();
  if (user) {
    formData.value = {
      openid: user.openid,
      nickName: user.nickName || "",
      avatarUrl: user.avatarUrl || "",
    };
  }
});

const onChooseAvatar = async (e: any) => {
  try {
    uni.showLoading({ title: "上传中..." });
    const result: any = await uploadFile({
      filePath: e.detail.avatarUrl,
      name: "file",
      formData: { type: "user_avatar" },
    });
    if (result.code === 0) {
      formData.value.avatarUrl = result.data.url;
      uni.showToast({ title: "已同步头像", icon: "success" });
    }
  } catch (e) {
  } finally {
    uni.hideLoading();
  }
};

const onNicknameBlur = () => {
  // Sync with input value
};

const handleCopyId = () => {
  uni.setClipboardData({
    data: formData.value.openid,
    success: () => uni.showToast({ title: "已复制ID", icon: "none" }),
  });
};

const handleSubmit = async () => {
  if (!formData.value.nickName.trim()) {
    uni.showToast({ title: "请输入昵称", icon: "none" });
    return;
  }
  try {
    isSubmitting.value = true;
    await authApi.apiUpdateUserInfo({
      nickName: formData.value.nickName,
      avatarUrl: formData.value.avatarUrl,
    });
    const user = getUserInfo();
    if (user) {
      setUserInfo({
        ...user,
        nickName: formData.value.nickName,
        avatarUrl: formData.value.avatarUrl,
      });
    }
    uni.showToast({ title: "保存成功", icon: "success" });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (error: any) {
    uni.showToast({ title: error.message || "失败", icon: "none" });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/colors.scss";

.profile-container {
  min-height: 100vh;
  background: $color-bg-secondary;
}

.profile-scroll {
  height: calc(100vh - 160rpx);
}

.profile-content {
  padding: 48rpx 32rpx;
}

.avatar-hero-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;

  .avatar-trigger {
    position: relative;
    width: 200rpx;
    height: 200rpx;
    margin-bottom: 24rpx;
    background: transparent;
    padding: 0;
    line-height: normal;
    &::after {
      border: none;
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 6rpx solid $color-primary-lighter;
    }
    .camera-fab {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 64rpx;
      height: 64rpx;
      background: $color-primary;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 4rpx solid #fff;
      box-shadow: 0 4rpx 12rpx rgba(123, 211, 162, 0.3);
    }
  }
  .upload-hint {
    font-size: 24rpx;
    font-weight: 600;
    color: $color-text-tertiary;
  }
}

.form-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 8rpx 40rpx;
}

.form-item-premium {
  padding: 40rpx 0;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .l {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    .label {
      font-size: 22rpx;
      font-weight: 800;
      color: $color-text-tertiary;
      text-transform: uppercase;
    }
    .nickname-input {
      font-size: 32rpx;
      font-weight: 700;
      color: $color-text-primary;
    }
    .val-txt {
      font-size: 28rpx;
      font-weight: 600;
      color: $color-text-secondary;
      font-family: monospace;
    }
  }

  &.readonly {
    opacity: 0.8;
  }
}

.form-divider {
  height: 1rpx;
  background: $color-divider;
}

.info-guide {
  margin-top: 32rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 12rpx;
  color: $color-text-tertiary;
  font-size: 22rpx;
  font-weight: 500;
}

.safe-bottom-dock {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40rpx 48rpx calc(40rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, transparent 0%, #fff 40%);
  z-index: 100;
}
</style>
