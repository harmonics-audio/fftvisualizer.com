<script setup lang="ts">
import type { NuxtError } from '#app'
import type { ContentNavigationItem, PageCollections } from '@nuxt/content'
import * as nuxtUiLocales from '@nuxt/ui/locale'

// Overrides docus 5.12.3's app/error.vue. Nuxt renders error.vue *instead of* app.vue,
// and docus only applies its `docus-sub-header` wrapper (the thing that grows
// --ui-header-height from 64px to 112px to fit the tab row) inside app.vue. The error
// page therefore drew a two-row header inside a one-row-tall box. This copy adds the
// wrapper back; the i18n branches of the original are dropped since the site is
// single-locale.
const props = defineProps<{
  error: NuxtError
}>()

const { locale, t } = useDocusI18n()

const nuxtUiLocale = computed(() => nuxtUiLocales[locale.value as keyof typeof nuxtUiLocales] || nuxtUiLocales.en)

useHead({
  htmlAttrs: {
    lang: computed(() => nuxtUiLocale.value.code),
    dir: computed(() => nuxtUiLocale.value.dir),
  },
})

const localizedError = computed(() => ({
  ...props.error,
  statusMessage: t('common.error.title'),
  message: t('common.error.description'),
}))

useSeoMeta({
  title: () => t('common.error.title'),
  description: () => t('common.error.description'),
})

const { data: navigation } = await useAsyncData('navigation_docs', () => queryCollectionNavigation('docs' as keyof PageCollections), {
  transform: (data: ContentNavigationItem[]) => transformNavigation(data, false),
})

provide('navigation', navigation)

const { subNavigationMode } = useSubNavigation(navigation)
</script>

<template>
  <UApp :locale="nuxtUiLocale">
    <div :class="{ 'docus-sub-header': subNavigationMode === 'header' }">
      <AppHeader />

      <UError :error="localizedError" />

      <AppFooter />

      <ClientOnly>
        <AppSearch :navigation="navigation" />
      </ClientOnly>
    </div>
  </UApp>
</template>
