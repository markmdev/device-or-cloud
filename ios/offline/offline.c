// Loaded into the app by the walk to stand in for flight mode, which the iOS simulator doesn't have:
// every network connection the app tries fails as it does on a phone with no network. Connections
// inside the device (to the system's own services, the on-device model among them) are left alone.
#include <errno.h>
#include <sys/socket.h>

#define INTERPOSE(replacement, replacee) \
  __attribute__((used)) static struct { const void *a, *b; } interpose_##replacee \
  __attribute__((section("__DATA,__interpose"))) = { (const void *)&replacement, (const void *)&replacee };

static int offline_connect(int s, const struct sockaddr *to, socklen_t len) {
  if (to && to->sa_family != AF_INET && to->sa_family != AF_INET6) return connect(s, to, len);
  errno = ENETDOWN;
  return -1;
}

static int offline_connectx(int s, const sa_endpoints_t *ends, sae_associd_t assoc, unsigned int flags,
                            const struct iovec *iov, unsigned int iovcnt, size_t *sent, sae_connid_t *conn) {
  const struct sockaddr *to = ends ? ends->sae_dstaddr : 0;
  if (to && to->sa_family != AF_INET && to->sa_family != AF_INET6) return connectx(s, ends, assoc, flags, iov, iovcnt, sent, conn);
  errno = ENETDOWN;
  return -1;
}

INTERPOSE(offline_connect, connect)
INTERPOSE(offline_connectx, connectx)
